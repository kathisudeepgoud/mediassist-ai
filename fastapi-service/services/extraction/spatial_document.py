"""
Unified Spatial Document Model Builder
MedAssist AI — Constructs Multi-Page Spatial Lines and Blocks from Tokens
"""

import math
from typing import List, Dict, Optional
from .models import SpatialToken, SpatialLine, SpatialBlock, BoundingBox, RegionType


class SpatialDocumentBuilder:
    """
    Builds a hierarchical 2D spatial representation from unordered spatial tokens:
    Tokens -> Spatial Lines -> Spatial Blocks -> Unified Multi-Page Document Model
    """

    DEFAULT_Y_TOLERANCE_POINTS = 3.5

    @classmethod
    def group_tokens_into_lines(
        cls,
        tokens: List[SpatialToken],
        y_tolerance: float = DEFAULT_Y_TOLERANCE_POINTS
    ) -> List[SpatialLine]:
        """
        Groups spatial tokens on the same page into horizontal lines by matching vertical midpoint y_center.
        Sorts tokens within each line from left to right (x0 ascending).
        """
        if not tokens:
            return []

        # Sort tokens primarily by page, then vertical position y0, then x0
        sorted_tokens = sorted(tokens, key=lambda t: (t.page, t.bbox.y0, t.bbox.x0))

        lines_by_page: Dict[int, List[List[SpatialToken]]] = {}

        for token in sorted_tokens:
            p = token.page
            if p not in lines_by_page:
                lines_by_page[p] = []

            # Check if token belongs to an existing horizontal cluster on this page
            t_mid_y = token.bbox.center_y
            assigned = False

            for cluster in lines_by_page[p]:
                cluster_mid_y = sum(tok.bbox.center_y for tok in cluster) / len(cluster)
                # Adaptive tolerance based on token height
                tok_h = token.bbox.height
                effective_tol = max(y_tolerance, min(6.0, tok_h * 0.4))

                if abs(cluster_mid_y - t_mid_y) <= effective_tol:
                    cluster.append(token)
                    assigned = True
                    break

            if not assigned:
                lines_by_page[p].append([token])

        spatial_lines: List[SpatialLine] = []

        for p in sorted(lines_by_page.keys()):
            # Sort line clusters by their average y position
            page_clusters = sorted(
                lines_by_page[p],
                key=lambda c: sum(tok.bbox.center_y for tok in c) / len(c)
            )

            for cluster in page_clusters:
                # Sort words left-to-right
                sorted_cluster = sorted(cluster, key=lambda t: t.bbox.x0)
                
                # Compute bounding box for the entire line
                min_x0 = min(t.bbox.x0 for t in sorted_cluster)
                min_y0 = min(t.bbox.y0 for t in sorted_cluster)
                max_x1 = max(t.bbox.x1 for t in sorted_cluster)
                max_y1 = max(t.bbox.y1 for t in sorted_cluster)
                y_center = (min_y0 + max_y1) / 2.0

                line_text = " ".join(t.text for t in sorted_cluster).strip()

                s_line = SpatialLine(
                    tokens=sorted_cluster,
                    text=line_text,
                    bbox=BoundingBox(x0=min_x0, y0=min_y0, x1=max_x1, y1=max_y1),
                    page=p,
                    y_center=y_center
                )
                spatial_lines.append(s_line)

        return spatial_lines

    @classmethod
    def group_lines_into_blocks(
        cls,
        lines: List[SpatialLine],
        max_line_gap_points: float = 18.0
    ) -> List[SpatialBlock]:
        """
        Groups lines into contiguous vertical blocks when lines are separated by small line gaps.
        """
        if not lines:
            return []

        blocks: List[SpatialBlock] = []
        curr_lines: List[SpatialLine] = []
        curr_page = lines[0].page

        for line in lines:
            if line.page != curr_page:
                if curr_lines:
                    blocks.append(cls._create_block(curr_lines, curr_page))
                    curr_lines = []
                curr_page = line.page

            if not curr_lines:
                curr_lines.append(line)
            else:
                prev_line = curr_lines[-1]
                gap = line.bbox.y0 - prev_line.bbox.y1
                if 0 <= gap <= max_line_gap_points:
                    curr_lines.append(line)
                else:
                    blocks.append(cls._create_block(curr_lines, curr_page))
                    curr_lines = [line]

        if curr_lines:
            blocks.append(cls._create_block(curr_lines, curr_page))

        return blocks

    @staticmethod
    def _create_block(lines: List[SpatialLine], page: int) -> SpatialBlock:
        min_x0 = min(l.bbox.x0 for l in lines)
        min_y0 = min(l.bbox.y0 for l in lines)
        max_x1 = max(l.bbox.x1 for l in lines)
        max_y1 = max(l.bbox.y1 for l in lines)

        return SpatialBlock(
            lines=lines,
            bbox=BoundingBox(x0=min_x0, y0=min_y0, x1=max_x1, y1=max_y1),
            page=page
        )
