WITH CourseWindows AS (
  SELECT
    imo,
    vesselName,
    System.Timestamp() AS windowEnd,
    AVG(speed) AS avgSpeed,
    MAX(courseDelta) AS maxCourseDelta,
    MAX(aisAgeMinutes) AS maxAisAgeMinutes,
    MIN(hotZoneDistanceNm) AS minHotZoneDistanceNm
  FROM aisinput TIMESTAMP BY eventTime
  GROUP BY imo, vesselName, TumblingWindow(minute, 2)
)
SELECT
  imo,
  vesselName,
  windowEnd,
  avgSpeed,
  maxCourseDelta,
  maxAisAgeMinutes,
  minHotZoneDistanceNm,
  CASE
    WHEN maxCourseDelta >= 45 OR maxAisAgeMinutes >= 15 OR minHotZoneDistanceNm <= 8 THEN 1
    ELSE 0
  END AS requiresInference
INTO functionoutput
FROM CourseWindows
WHERE maxCourseDelta >= 30 OR maxAisAgeMinutes >= 10 OR avgSpeed <= 4 OR minHotZoneDistanceNm <= 10;
