function ProgressBar({
  value = 0,
  max = 100,
  label = "",
  showPercentage = true,
}) {

  const safeMax =
    max > 0
      ? max
      : 100;

  const percentage =
    Math.min(
      100,
      Math.max(
        0,
        (value / safeMax) * 100
      )
    );


  return (

    <div className="progress-container">

      {label && (

        <div className="progress-header">

          <span className="progress-label">
            {label}
          </span>

          {showPercentage && (

            <span className="progress-percentage">
              {Math.round(
                percentage
              )}%
            </span>

          )}

        </div>

      )}


      <div className="progress-track">

        <div
          className="progress-fill"
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}


export default ProgressBar;