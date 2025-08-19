SELECT 
  DATE(s.start) as shift_date,
  s.start,
  st.name as shift_type,
  su.status,
  s.location
FROM "Signup" su
JOIN "User" u ON su."userId" = u.id
JOIN "Shift" s ON su."shiftId" = s.id
JOIN "ShiftType" st ON s."shiftTypeId" = st.id
WHERE u.email = 'volunteer@example.com'
  AND s.start >= NOW()
  AND su.status = 'CONFIRMED'
ORDER BY s.start;