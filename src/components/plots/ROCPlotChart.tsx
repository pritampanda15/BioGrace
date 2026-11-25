import React, { useMemo } from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { ROCInputRow } from '../../lib/bioAnalytics';
import type { EditablePlotField } from '../ui/InlinePlotEditor';
import { computeROCCurves } from '../../lib/bioAnalytics';
import { resolvePlotTheme } from '../../lib/palettes';

interface ROCPlotChartProps {
  rows: ROCInputRow[];
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: (field: EditablePlotField, label: string, currentValue: string) => void;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 64, right: 248, bottom: 66, left: 78 };

export const ROCPlotChart: React.FC<ROCPlotChartProps> = ({
  rows,
  config,
  darkMode,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;
  const models = useMemo(() => computeROCCurves(rows), [rows]);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const strokeHalo = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5.5 : 5.5;

  const side = Math.min(WIDTH - MARGIN.left - MARGIN.right, HEIGHT - MARGIN.top - MARGIN.bottom);
  const toX = (fpr: number) => MARGIN.left + fpr * side;
  const toY = (tpr: number) => MARGIN.top + side - tpr * side;
  const ticks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto rounded-2xl"
        style={{ fontFamily: theme.fontFamilyCss }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={16} fill={bgFill} />

        <text
          x={MARGIN.left}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('title', 'Plot Title', config.title || 'Biomarker Diagnostic Performance (ROC Curve)');
          }}
        >
          {config.title || 'Biomarker Diagnostic Performance (ROC Curve)'}
        </text>
        <text
          x={MARGIN.left}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('subtitle', 'Subtitle', config.subtitle || 'AUROC with 95% Hanley–McNeil CI · Dots mark optimal Youden J threshold');
          }}
        >
          {config.subtitle || 'AUROC with 95% Hanley–McNeil CI · Dots mark optimal Youden J threshold'}
        </text>

        {/* Grid */}
        <g stroke={gridColor} strokeOpacity={0.32} strokeDasharray="3 3" strokeWidth={0.7}>
          {ticks.slice(1).map((t) => (
            <React.Fragment key={t}>
              <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top} y2={MARGIN.top + side} />
              <line x1={MARGIN.left} x2={MARGIN.left + side} y1={toY(t)} y2={toY(t)} />
            </React.Fragment>
          ))}
        </g>

        {/* Random Chance Diagonal (AUC = 0.50) */}
        <line
          x1={toX(0)}
          y1={toY(0)}
          x2={toX(1)}
          y2={toY(1)}
          stroke={inkSecondary}
          strokeOpacity={0.5}
          strokeDasharray="5 4"
          strokeWidth={1.15}
        />

        {/* Spines */}
        <g stroke={inkAxis} strokeWidth={theme.axesLinewidth}>
          <line x1={MARGIN.left} x2={MARGIN.left + side} y1={MARGIN.top + side} y2={MARGIN.top + side} />
          <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + side} />
          {theme.topRightSpines && (
            <>
              <line x1={MARGIN.left} x2={MARGIN.left + side} y1={MARGIN.top} y2={MARGIN.top} />
              <line x1={MARGIN.left + side} x2={MARGIN.left + side} y1={MARGIN.top} y2={MARGIN.top + side} />
            </>
          )}
        </g>

        {/* Ticks */}
        <g fill={inkSecondary} fontSize={baseFs - 1}>
          {ticks.map((t) => (
            <g key={`rt-${t}`}>
              <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top + side} y2={MARGIN.top + side + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={toX(t)} y={MARGIN.top + side + 20} textAnchor="middle">{t.toFixed(2)}</text>
              <line x1={MARGIN.left} x2={MARGIN.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={MARGIN.left - 11} y={toY(t) + 4} textAnchor="end">{t.toFixed(2)}</text>
            </g>
          ))}
        </g>

        {/* ROC Curves + Best Youden J Dot */}
        {models.map((m, idx) => {
          const col = palette.colors[idx % palette.colors.length];
          const d = m.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.fpr).toFixed(1)} ${toY(p.tpr).toFixed(1)}`)
            .join(' ');
          const areaD = `${d} L ${toX(1).toFixed(1)} ${toY(0).toFixed(1)} Z`;
          return (
            <g key={m.model}>
              {idx === 0 && <path d={areaD} fill={col} fillOpacity={0.09} />}
              <path d={d} fill="none" stroke={col} strokeWidth={theme.lineWidth * 2.1} strokeLinecap="round" />
              <circle
                cx={toX(m.bestFpr)}
                cy={toY(m.bestTpr)}
                r={5.5}
                fill={col}
                stroke={strokeHalo}
                strokeWidth={1.8}
              />
            </g>
          );
        })}

        {/* Right Side AUROC Table Legend */}
        <g transform={`translate(${MARGIN.left + side + 26}, ${MARGIN.top + 24})`}>
          <text x={0} y={0} fill={inkPrimary} fontSize={11.5 * theme.fontScale} fontWeight={700}>
            Model AUROC (95% CI)
          </text>
          {models.map((m, i) => (
            <g key={m.model} transform={`translate(0, ${28 + i * 48})`}>
              <line x1={0} x2={18} y1={-4} y2={-4} stroke={palette.colors[i % palette.colors.length]} strokeWidth={3} />
              <text x={24} y={0} fill={inkPrimary} fontSize={11 * theme.fontScale} fontWeight={700}>
                {m.model}
              </text>
              <text x={24} y={16} fill={inkSecondary} fontSize={10.5 * theme.fontScale}>
                AUC = {m.auc.toFixed(3)} ({m.ciLow.toFixed(2)}–{m.ciHigh.toFixed(2)})
              </text>
              <text x={24} y={30} fill={inkSecondary} fontSize={9.5 * theme.fontScale}>
                Best Youden J = {m.youdenJ.toFixed(2)} (Sens {Math.round(m.bestTpr * 100)}%, Spec {Math.round((1 - m.bestFpr) * 100)}%)
              </text>
            </g>
          ))}
        </g>

        {/* Axis Titles */}
        <text
          x={MARGIN.left + side / 2}
          y={HEIGHT - 16}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs + 0.5}
          fontWeight={600}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('xLabel', 'X-Axis Label', config.xLabel || 'False Positive Rate (1 − Specificity)');
          }}
        >
          {config.xLabel || 'False Positive Rate (1 − Specificity)'}
        </text>
        <text
          transform={`translate(22, ${MARGIN.top + side / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs + 0.5}
          fontWeight={600}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('yLabel', 'Y-Axis Label', config.yLabel || 'True Positive Rate (Sensitivity)');
          }}
        >
          {config.yLabel || 'True Positive Rate (Sensitivity)'}
        </text>
      </svg>
    </div>
  );
};
