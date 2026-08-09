import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Report } from '../types.ts'
import { FaTrash, FaFolderOpen } from 'react-icons/fa'
import authHeaders from '../utils/authHeaders.ts'

/* ========================================================
This page is the main page for the report index. It displays
a list of reports and allows the user to upload a PGN file
and create a new report.
======================================================= */

/* ========================================================
The backend expects a POST request with a FormData object
containing the PGN file and the player name. The form data
is sent to the server, and the server creates a new report
with the given player name and the PGN file. The server
returns the created report as a JSON object. The client
then displays the created report.
======================================================= */

function ReportIndex() {
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    if (!localStorage.getItem('authToken')) return
    fetch('/api/reports/', {
        headers: authHeaders(),
    })
      .then(response => {                                                                  
        if (response.status === 401) {
            localStorage.removeItem('authToken')
            window.location.href = '/login'
            return
        }
        return response.json()
    })
    .then(data => {
        if (Array.isArray(data)) setReports(data)
    })
  }, [])

  async function deleteReport(reportId: number) {
      await fetch(`/api/reports/${reportId}/`, {
          method: 'DELETE',
          headers: authHeaders(),
      })
      setReports(reports.filter(
          report => report.id !== reportId
      ))
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Saved Reports</h1>
      {reports.length === 0 && (
        <p className="text-sm text-gray-500 text-center mb-4">No saved reports. Upload a PGN file to get started.</p>
      )}
      <Link
        to="/reports/create"
        className="block text-center bg-blue-500 text-white rounded p-2 w-full font-semibold mb-6"
      >
        Upload PGN File
      </Link>

      <div className="space-y-4">
        {reports.map(report => (
          <div key={report.id} className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800">
              <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">{report.report_name}</h2>
                  <button onClick={() => deleteReport(report.id)}><FaTrash /></button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Games: {report.all_games_stats.total_games} | Win Rate: {report.all_games_stats.win_rate}% | Openings: {report.all_games_stats.opening_family_count}
              </p>
              <hr className="my-2 border-gray-200 dark:border-gray-700" />
              <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">{report.created_at}</p>
                  <Link to={`/reports/${report.id}`}><FaFolderOpen /></Link>
              </div>
          </div>
        ))}
      </div>
    </div>
  )
}
  
  export default ReportIndex