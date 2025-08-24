
// FILE: src/pages/RepoCommits.jsx
import React, { useMemo } from "react";
import { useRepo } from "./RepoRouter";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend } from "chart.js";
import 'chartjs-adapter-date-fns';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend);

export default function RepoCommits() {
  const { details } = useRepo();
  const commitDates = details?.commits?.map(c => c.date).filter(Boolean) || [];
  const commitCounts = {};
  commitDates.forEach(date => {
    const day = date.slice(0,10);
    commitCounts[day] = (commitCounts[day] || 0) + 1;
  });
  const labels = Object.keys(commitCounts).sort();
  const dataPoints = labels.map(l => commitCounts[l]);
  const timelineData = {
    labels,
    datasets: [{ label: 'Commits per day', data: dataPoints, fill: false, borderColor: '#6366f1', backgroundColor: '#6366f1', tension: 0.3 }]
  };

  if (!details) return <div className="p-6 text-gray-400">No commit data available.</div>;

  return (
    <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
      <h2 className="text-xl font-semibold mb-4">Commit History</h2>
      {labels.length > 0 ? (
        <div className="bg-black/50 p-4 rounded-xl border border-indigo-700/30">
          <Line data={timelineData} options={{ scales: { x: { title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Commits' }, beginAtZero: true } }, plugins: { legend: { display: false } } }} />
        </div>
      ) : (
        <div className="text-gray-400">No commits found.</div>
      )}
    </div>
  );
}
