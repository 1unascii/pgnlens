import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Report } from '../types.ts'
import { FaTrash, FaFolderOpen } from 'react-icons/fa'

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
      fetch('/api/reports/')
          .then(response => response.json())
          .then(data => setReports(data))
  }, [])

  return (
    
    
    <div>  
        <h1>Saved Reports</h1>
        <Link to="/reports/create">Upload PGN File</Link>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(report => (
          <div key={report.id} className="border rounded-lg p-4 shadow-sm mb-4 max-w-4xl mx-auto">
              <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">{report.report_name}</h2>
                  <button><FaTrash /></button>
              </div>
              <p>Games: {report.total_games} | Win Rate: {report.win_rate}% | Openings: {report.opening_family_count}</p>
              <hr className="my-2" />
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