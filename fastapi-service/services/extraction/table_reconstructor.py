"""
Table and Grid Reconstruction Module
MedAssist AI — Reconstructs 2D Table Columns, Multi-Column Rows, and Aligned Measurement Cells
"""

import re
from typing import List, Dict, Optional, Tuple, Any
from .models import (
    SpatialLine, SpatialToken, TableColumn, TableColumnType,
    TableRow, TableCell, TableGrid, BoundingBox, RegionType
)


class TableReconstructor:
    """
    Reconstructs structured tabular grids from spatial lines:
    1. Identifies column headers and column boundaries (X-intervals)
    2. Maps cells to appropriate column types (TEST_NAME, RESULT_VALUE, UNIT, REFERENCE_RANGE, FLAG, METHOD)
    3. Handles multi-layout hospital tables (both horizontal grid and inline colon formatted rows)
    """

    KNOWN_FLAG_TOKENS = {'high', 'low', 'normal', 'abnormal', 'borderline', 'critical', 'positive', 'negative', 'h', 'l', '*'}

    @classmethod
    def reconstruct_table(
        cls,
        lines: List[SpatialLine],
        page_num: int,
        section_name: Optional[str] = None
    ) -> TableGrid:
        """
        Reconstructs table grid from lines on a given page.
        """
        table_lines = [
            l for l in lines 
            if l.page == page_num and l.region_type in [RegionType.TABLE_BODY, RegionType.TABLE_HEADER]
        ]

        if not table_lines:
            return TableGrid(
                page=page_num,
                bbox=BoundingBox(x0=0, y0=0, x1=600, y1=800),
                section_name=section_name
            )

        min_x0 = min(l.bbox.x0 for l in table_lines)
        min_y0 = min(l.bbox.y0 for l in table_lines)
        max_x1 = max(l.bbox.x1 for l in table_lines)
        max_y1 = max(l.bbox.y1 for l in table_lines)

        rows: List[TableRow] = []

        for idx, line in enumerate(table_lines):
            row = cls._parse_line_to_row(line, idx)
            rows.append(row)

        return TableGrid(
            page=page_num,
            bbox=BoundingBox(x0=min_x0, y0=min_y0, x1=max_x1, y1=max_y1),
            rows=rows,
            section_name=section_name
        )

    @classmethod
    def _parse_line_to_row(cls, line: SpatialLine, row_idx: int) -> TableRow:
        """
        Decomposes a spatial line into candidate cells.
        """
        cells: List[TableCell] = []
        is_header = line.region_type == RegionType.TABLE_HEADER

        # Group tokens into semantic chunks by spatial distance
        tokens = line.tokens
        if not tokens:
            return TableRow(
                row_index=row_idx,
                cells=[],
                y0=line.bbox.y0,
                y1=line.bbox.y1,
                page=line.page,
                raw_text="",
                is_header=is_header
            )

        # Cluster tokens by horizontal gap
        token_groups: List[List[SpatialToken]] = []
        curr_group: List[SpatialToken] = [tokens[0]]

        for i in range(1, len(tokens)):
            prev_tok = tokens[i - 1]
            curr_tok = tokens[i]
            gap = curr_tok.bbox.x0 - prev_tok.bbox.x1

            # A gap > 8.0 points usually separates table columns
            if gap > 8.0:
                token_groups.append(curr_group)
                curr_group = [curr_tok]
            else:
                curr_group.append(curr_tok)

        if curr_group:
            token_groups.append(curr_group)

        for group in token_groups:
            c_text = " ".join(t.text for t in group).strip()
            min_x0 = min(t.bbox.x0 for t in group)
            min_y0 = min(t.bbox.y0 for t in group)
            max_x1 = max(t.bbox.x1 for t in group)
            max_y1 = max(t.bbox.y1 for t in group)

            cell = TableCell(
                text=c_text,
                tokens=group,
                bbox=BoundingBox(x0=min_x0, y0=min_y0, x1=max_x1, y1=max_y1),
                column_type=cls._infer_cell_column_type(c_text)
            )
            cells.append(cell)

        return TableRow(
            row_index=row_idx,
            cells=cells,
            y0=line.bbox.y0,
            y1=line.bbox.y1,
            page=line.page,
            raw_text=line.text,
            is_header=is_header
        )

    @classmethod
    def _infer_cell_column_type(cls, text: str) -> TableColumnType:
        norm = text.strip().lower()

        # Flag
        if norm in cls.KNOWN_FLAG_TOKENS:
            return TableColumnType.FLAG

        # Method (e.g., "(Photometry)", "(Electrical impedence)")
        if re.match(r'^\(?(?:photometry|electrical\s*impedence|vcs\s*technology|clia|immunoturbidometry|calculated)\)?$', norm):
            return TableColumnType.METHOD

        # Reference Range: "13.0 - 17.0", "< 140", ">= 126", "40 - 80"
        if re.match(r'^(?:<=|>=|<|>|=)?\s*[\d,\.]+\s*[\-\–\:]\s*[\d,\.]+$', norm) or re.match(r'^[<>=]\s*[\d,\.]+$', norm):
            return TableColumnType.REFERENCE_RANGE

        # Unit: "mg/dL", "g/dL", "%", "cumm", "fL", "pg"
        if re.match(r'^(?:mg\/dl|g\/dl|gm\/dl|\%|fl|pg|cumm|\/cumm|cells\/cumm|lakhs\/cumm|million\/cumm|u\/l|iu\/l|meq\/l|mmol\/l|uiu\/ml|ng\/dl|pg\/ml|mg\/l|ratio)$', norm):
            return TableColumnType.UNIT

        # Numeric Result Value: "155", "218", "10.70", "5,100", "0.06"
        if re.match(r'^(?:<=|>=|<|>|=)?\s*-?\d[\d,\.]*$', norm):
            return TableColumnType.RESULT_VALUE

        # Qualitative value: "Positive", "Negative", "Reactive", "Normal"
        if norm in ['positive', 'negative', 'reactive', 'non-reactive', 'trace', 'nil']:
            return TableColumnType.RESULT_VALUE

        return TableColumnType.TEST_NAME
