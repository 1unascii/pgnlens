import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Report } from '../types.ts'

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

function ReportsIndex() {
    const [reports, setReports] = useState<Report[]>([])
  
    useEffect(() => {
      fetch('/api/reports/')           // hits Django via the Vite proxy
        .then(response => response.json())  // parse the JSON body
        .then(data => setReports(data))     // store it in state
    }, [])  // empty array = run once when the component first mounts
  
    return (
      <div>
        <h1>Saved Reports</h1>
        <Link to="/reports/create">Upload PGN File</Link>

        {reports.map(report => (
          <div key={report.id}>
            <h2>{report.report_name}</h2>
            <p>{report.wins}W / {report.losses}L / {report.draws}</p>
            <p>{report.date_created}</p>
            <Link to={`/reports/${report.id}`}>Open</Link>
          </div>
        ))}
      </div>
    )
  }
  
  export default ReportsIndex