"""Carrier belt pocket segmentation and occupancy detection.

Segments continuous tape-and-reel / carrier belts into discrete pocket slots,
detects empty cavities, and projects single-part reference ROIs to each occupied slot.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

try:
    import cv2
except ImportError:
    cv2 = None

import numpy as np

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CarrierSlot:
    slotIndex: int
    x: int
    y: int
    width: int
    height: int
    isOccupied: bool
    occupancyScore: float
    state: str  # "OCCUPIED" or "EMPTY"
    reason: str


@dataclass(frozen=True)
class BeltSegmentationResult:
    totalSlots: int
    occupiedSlots: int
    emptySlots: int
    slots: tuple[CarrierSlot, ...]


def _check_cavity_occupancy(
    slot_img: np.ndarray,
    min_variance: float = 180.0,
    min_edge_density: float = 0.015,
) -> tuple[bool, float, str]:
    """Check whether a carrier tape pocket cavity contains an IC device or is empty."""
    if slot_img is None or slot_img.size == 0:
        return False, 0.0, "Empty or invalid slot frame"

    if cv2 is not None:
        if len(slot_img.shape) == 3:
            gray = cv2.cvtColor(slot_img, cv2.COLOR_BGR2GRAY)
        else:
            gray = slot_img

        # Cavity center ROI (avoid tape edge borders)
        h, w = gray.shape[:2]
        pad_y = int(h * 0.15)
        pad_x = int(w * 0.15)
        cavity = gray[pad_y : h - pad_y, pad_x : w - pad_x]

        if cavity.size == 0:
            return False, 0.0, "Empty cavity region"

        variance = float(np.var(cavity))
        edges = cv2.Canny(cavity, 40, 120)
        edge_density = float(np.count_nonzero(edges)) / float(cavity.size)

        has_edges = edge_density >= min_edge_density
        has_variance = variance >= min_variance
        is_occupied = has_edges and has_variance

        # Score occupancy 0-100%
        score_var = min(50.0, (variance / min_variance) * 25.0)
        score_edge = min(50.0, (edge_density / min_edge_density) * 25.0)
        total_score = min(100.0, round(score_var + score_edge, 1))

        if is_occupied:
            reason = f"Device detected: edge density {edge_density:.3f}, cavity variance {variance:.0f}"
        else:
            reason = f"Empty pocket cavity: edge density {edge_density:.3f} < {min_edge_density}, variance {variance:.0f}"

        return is_occupied, total_score, reason

    # Numpy fallback
    variance = float(np.var(slot_img))
    is_occupied = variance >= min_variance

    return is_occupied, 80.0 if is_occupied else 10.0, "Numpy variance check"


def segment_carrier_belt(
    image: np.ndarray,
    expected_slot_width: int | None = None,
    expected_slot_count: int | None = None,
) -> BeltSegmentationResult:
    """Decompose belt image into individual pocket slots and evaluate occupancy."""
    if image is None or image.size == 0:
        return BeltSegmentationResult(totalSlots=0, occupiedSlots=0, emptySlots=0, slots=())

    img_h, img_w = image.shape[:2]

    # Determine pocket count along horizontal belt axis
    if expected_slot_count is not None and expected_slot_count > 0:
        k_slots = expected_slot_count
    elif expected_slot_width is not None and expected_slot_width > 0:
        k_slots = max(1, round(img_w / expected_slot_width))
    else:
        # Aspect ratio heuristic: standard IC pocket has aspect ratio ~ 1.0 to 1.3
        ar = img_w / max(1, img_h)
        k_slots = max(1, round(ar / 1.15))

    slot_w = img_w // k_slots
    slots_list: list[CarrierSlot] = []
    occupied_count = 0
    empty_count = 0

    for idx in range(k_slots):
        x_start = idx * slot_w
        x_end = (idx + 1) * slot_w if idx < k_slots - 1 else img_w
        cur_w = x_end - x_start

        slot_slice = image[:, x_start:x_end]
        is_occupied, score, reason = _check_cavity_occupancy(slot_slice)

        if is_occupied:
            occupied_count += 1
            state = "OCCUPIED"
        else:
            empty_count += 1
            state = "EMPTY"

        slots_list.append(
            CarrierSlot(
                slotIndex=idx,
                x=x_start,
                y=0,
                width=cur_w,
                height=img_h,
                isOccupied=is_occupied,
                occupancyScore=score,
                state=state,
                reason=reason,
            )
        )

    return BeltSegmentationResult(
        totalSlots=k_slots,
        occupiedSlots=occupied_count,
        emptySlots=empty_count,
        slots=tuple(slots_list),
    )
