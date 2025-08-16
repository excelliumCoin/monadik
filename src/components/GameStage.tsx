'use client';

type Props = {
  running: boolean;
  playerLane: number;     // 0..2
  obstacleLane: number;   // 0..2
};

export default function GameStage({ running, playerLane, obstacleLane }: Props) {
  return (
    <div className="stage glass">
      <div className="track">
        <div className={`lanes ${running ? 'running' : ''}`}>
          {[0, 1, 2].map((lane) => (
            <div key={lane} className="lane">
              {/* Oyuncu */}
              {playerLane === lane && (
                <div className="car" aria-label="player car">
                  <span className="car-body" />
                  <span className="car-shadow" />
                </div>
              )}
              {/* Engel */}
              {obstacleLane === lane && (
                <div className="obstacle" aria-label="obstacle">🚧</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
