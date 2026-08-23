import cv2
import numpy as np

def evaluate_archival_sift(player_img_bytes, archival_img_bytes, min_matches=15):
    """
    Extracts SIFT keypoints and enforces geometric consistency using RANSAC.
    """
    # Convert byte streams to OpenCV matrices
    img_player = cv2.imdecode(np.frombuffer(player_img_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    img_archival = cv2.imdecode(np.frombuffer(archival_img_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    
    if img_player is None or img_archival is None:
        raise ValueError("Could not decode one or both image buffers.")

    # 1. Use SIFT
    sift = cv2.SIFT_create()
    kp1, des1 = sift.detectAndCompute(img_player, None)
    kp2, des2 = sift.detectAndCompute(img_archival, None)

    # 2. Matching (SIFT requires NORM_L2)
    bf = cv2.BFMatcher(cv2.NORM_L2, crossCheck=False)
    raw_matches = bf.knnMatch(des1, des2, k=2)
    
    # 3. Lowe's Ratio Test
    good_matches = []
    for m, n in raw_matches:
        if m.distance < 0.75 * n.distance:
            good_matches.append(m)

    # 4. RANSAC Geometric Verification
    inliers = []
    if len(good_matches) >= 4: 
        src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        
        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        
        if mask is not None:
            matches_mask = mask.ravel().tolist()
            inliers = [m for i, m in enumerate(good_matches) if matches_mask[i] == 1]

    # Evaluate based on geometrically consistent matches ONLY
    passed = len(inliers) >= min_matches

    return {
        "matches": len(inliers),
        "passed": bool(passed)
    }