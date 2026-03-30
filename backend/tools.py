
import math
from typing import Tuple


def calculate_distance(p1: Tuple[float, float, float],
                       p2: Tuple[float, float, float]) -> float:
    return math.sqrt(
        (p1[0] - p2[0]) ** 2 +
        (p1[1] - p2[1]) ** 2 +
        (p1[2] - p2[2]) ** 2
    )


def calculate_angle(a, b, c):
    """
    Calculates angle ABC (in degrees)
    """
    import numpy as np

    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    cos_angle = np.dot(ba, bc) / (
        np.linalg.norm(ba) * np.linalg.norm(bc)
    )

    angle = np.degrees(np.arccos(cos_angle))
    return float(angle)


def calculate_dihedral(p1, p2, p3, p4):
    """
    Calculates dihedral angle between four points.
    """
    import numpy as np

    p1 = np.array(p1)
    p2 = np.array(p2)
    p3 = np.array(p3)
    p4 = np.array(p4)

    b0 = -1.0 * (p2 - p1)
    b1 = p3 - p2
    b2 = p4 - p3

    b1 /= np.linalg.norm(b1)

    v = b0 - np.dot(b0, b1) * b1
    w = b2 - np.dot(b2, b1) * b1

    x = np.dot(v, w)
    y = np.dot(np.cross(b1, v), w)

    return float(np.degrees(np.arctan2(y, x)))