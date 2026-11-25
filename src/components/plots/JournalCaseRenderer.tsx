import React from 'react';
import type { JournalCaseMeta } from '../../lib/journalCasesCatalog';
import type { PublicationStyleSettings } from '../../types/biograce';
import { resolvePlotTheme } from '../../lib/palettes';
import { renderCasePartA } from './journalCasesPartA';
import { renderCasePartB } from './journalCasesPartB';

interface JournalCaseRendererProps {
  item: JournalCaseMeta;
  styleSettings: PublicationStyleSettings;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

const WIDTH = 840;
const HEIGHT = 560;

export const JournalCaseRenderer: React.FC<JournalCaseRendererProps> = ({
  item,
  styleSettings,
  darkMode,
  svgRef,
}) => {
  const theme = resolvePlotTheme(styleSettings);
  const paperBg = styleSettings.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const bgStroke = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5.5 : 5.5;

  const ctx = {
    W: WIDTH,
    H: HEIGHT,
    theme,
    inkPrimary,
    inkAxis,
    inkSecondary,
    bgStroke,
    baseFs,
    tickLen,
  };

  const num = Number(item.number);

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

        {/* Header */}
        <text
          x={40}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          letterSpacing="-0.015em"
        >
          {`${item.number} · ${item.title}`}
        </text>
        <text x={40} y={46} fill={inkSecondary} fontSize={baseFs - 1}>
          {`${item.journalSource} archetype · ${theme.journal.shortName} (${theme.widthMm} mm) · ${theme.palette.name}`}
        </text>

        {num <= 10 ? renderCasePartA(item.id, ctx) : renderCasePartB(item.id, ctx)}
      </svg>
    </div>
  );
};
