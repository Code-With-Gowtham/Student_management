import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const API_URL = 'http://localhost:8000'

const authAxios = (token) =>
  axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'))
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return
    localStorage.setItem('token', token)
    const client = authAxios(token)

    client.get('/api/me').then((res) => {
      setUser(res.data)
      localStorage.setItem('user', JSON.stringify(res.data))
    }).catch(() => {
      logout()
    })

    client.get('/api/dashboard').then((res) => {
      setDashboard(res.data)
    }).catch(() => {
      setDashboard(null)
    })
  }, [token])

  const logout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="app-shell">
      {!token ? (
        <Routes>
          <Route path="/login" element={<LoginPage setToken={setToken} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <>
          <div className="workspace">
            <aside className="sidebar">
              <Link className="brand" to="/"><span className="brand-mark">VE</span><span>Vertex Engineering</span></Link>
              <p className="nav-label">Campus operations</p>
              <nav className="side-nav">
                <Link to="/">Overview</Link>
                <Link to="/students">Students</Link>
                <Link to="/faculty">Faculty</Link>
                <Link to="/courses">Courses</Link>
                <Link to="/attendance">Attendance</Link>
                <Link to="/marks">Marks</Link>
              </nav>
              <div className="sidebar-footer"><span className="avatar">{(user?.username || 'U').slice(0, 1).toUpperCase()}</span><div><strong>{user?.username || 'User'}</strong><small>{user?.role || 'member'}</small></div><Link className="account-link" to="/account" title="Account settings">⚙</Link><button className="icon-button" onClick={logout} title="Sign out">↗</button></div>
            </aside>
            <main className="main-content">
              <header className="topbar"><span className="breadcrumb">Workspace / <strong>Overview</strong></span><span className="status-dot">Live system</span></header>
              <div className="container">
            <Routes>
              <Route path="/" element={<DashboardPage dashboard={dashboard} user={user} />} />
              <Route path="/account" element={<AccountPage token={token} user={user} />} />
              <Route path="/students" element={<StudentsPage token={token} isAdmin={user?.role === 'admin'} />} />
              <Route path="/faculty" element={<FacultyPage token={token} isAdmin={user?.role === 'admin'} />} />
              <Route path="/courses" element={<CoursesPage token={token} />} />
              <Route path="/attendance" element={<AttendancePage token={token} />} />
              <Route path="/marks" element={<MarksPage token={token} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  )
}

function LoginPage({ setToken }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const login = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { username, password })
      setToken(res.data.access_token)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <h2 className="page-title">Login</h2>
        <form onSubmit={login} className="form-grid">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button type="submit">Sign In</button>
        </form>
        {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
        <p>Use admin/admin123 or register a new account in the backend.</p>
      </div>
    </div>
  )
}

function AccountPage({ token, user }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await axios.post(`${API_URL}/api/auth/change-password`, form, { headers: { Authorization: `Bearer ${token}` } })
      setForm({ current_password: '', new_password: '', confirm_password: '' })
      setMessage({ type: 'success', text: 'Your password has been changed successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Password could not be changed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Account security</p><h1 className="page-title">Your account</h1><p className="subtle">Update your private sign-in details whenever you need.</p></div><span className="security-chip">Protected</span></div>
      <div className="account-layout">
        <section className="card profile-card"><span className="profile-avatar">{(user?.username || 'U').slice(0, 1).toUpperCase()}</span><h2>{user?.username || 'User'}</h2><p>{user?.email || 'Account holder'}</p><span className="role-chip">{user?.role || 'member'}</span></section>
        <section className="card form-card password-card"><div className="section-heading"><div><p className="eyebrow">Sign-in credentials</p><h2>Change password</h2><p className="subtle">Use at least 8 characters. Your current password is required.</p></div></div><form onSubmit={submit} className="password-form"><label>Current password<input required type="password" value={form.current_password} onChange={(event) => setForm({ ...form, current_password: event.target.value })} /></label><label>New password<input required minLength="8" type="password" value={form.new_password} onChange={(event) => setForm({ ...form, new_password: event.target.value })} /></label><label>Confirm new password<input required minLength="8" type="password" value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} /></label><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update password'}</button></form>{message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}</section>
      </div>
      <div className="security-note"><strong>New account?</strong><span>Students and faculty start with the temporary password supplied by the administrator. Change it here after your first login.</span></div>
    </>
  )
}

function DashboardPage({ dashboard, user }) {
  if (!dashboard) return <p>Loading dashboard...</p>

  const chartData = [
    { name: 'Students', value: dashboard.count_students },
    { name: 'Faculty', value: dashboard.count_faculty },
    { name: 'Departments', value: dashboard.count_departments },
    { name: 'Courses', value: dashboard.count_courses },
  ]

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Wednesday, September 23, 2026</p><h1 className="page-title">Good morning, {user?.username || 'User'}</h1><p className="subtle">Your engineering college, at a glance.</p></div><Link className="primary-action" to="/students">+ Add student</Link></div>
      <div className="card-grid">
        <div className="stat-card accent-coral">
          <span className="stat-icon">ST</span><h3>Students</h3>
          <p className="metric">{dashboard.count_students}</p>
          <small>Enrolled engineers</small>
        </div>
        <div className="stat-card accent-blue">
          <span className="stat-icon">FC</span><h3>Faculty</h3>
          <p className="metric">{dashboard.count_faculty}</p>
          <small>Teaching staff</small>
        </div>
        <div className="stat-card accent-yellow">
          <span className="stat-icon">DP</span><h3>Departments</h3>
          <p className="metric">{dashboard.count_departments}</p>
          <small>Engineering schools</small>
        </div>
        <div className="stat-card accent-green">
          <span className="stat-icon">CR</span><h3>Courses</h3>
          <p className="metric">{dashboard.count_courses}</p>
          <small>Active curriculum</small>
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="card chart-card">
          <div className="section-heading"><div><p className="eyebrow">At a glance</p><h2>Engineering college overview</h2></div><span className="period-pill">This year</span></div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Bar dataKey="value" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card summary-card">
          <div className="section-heading"><div><p className="eyebrow">Workspace health</p><h2>Quick summary</h2></div><span className="health-badge">Healthy</span></div>
          <div className="summary-row"><span>Signed in as</span><strong>{user?.role}</strong></div>
          <div className="summary-row"><span>Attendance records</span><strong>{dashboard.recent_attendance?.length || 0}</strong></div>
          <div className="summary-row"><span>Recent marks</span><strong>{dashboard.recent_marks?.length || 0}</strong></div>
          <Link className="text-link" to="/faculty">Manage your team →</Link>
        </div>
      </div>
    </>
  )
}

function StudentsPage({ token, isAdmin }) {
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ name: '', register_number: '', email: '', department_id: '', year: '1', section: 'A' })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([fetchData(), fetchDepartments()]).catch(() => setMessage({ type: 'error', text: 'Could not load student data.' }))
  }, [token])

  const fetchData = async () => {
    const res = await axios.get(`${API_URL}/api/students`, { headers: { Authorization: `Bearer ${token}` } })
    setStudents(res.data)
  }

  const fetchDepartments = async () => {
    const res = await axios.get(`${API_URL}/api/departments`, { headers: { Authorization: `Bearer ${token}` } })
    setDepartments(res.data)
    setForm((current) => ({ ...current, department_id: current.department_id || String(res.data[0]?.id || '') }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const response = await axios.post(`${API_URL}/api/students`, { ...form, department_id: Number(form.department_id), year: Number(form.year) }, { headers: { Authorization: `Bearer ${token}` } })
      await fetchData()
      setForm({ name: '', register_number: '', email: '', department_id: departments[0]?.id ? String(departments[0].id) : '', year: '1', section: 'A' })
      setMessage({ type: 'success', text: `Student saved. Login: ${response.data.account.username} · temporary password: welcome123` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Student could not be saved.' })
    } finally {
      setSaving(false)
    }
  }

  const removeStudent = async (student) => {
    if (!window.confirm(`Remove ${student.name} and their linked login? This cannot be undone.`)) return
    try {
      await axios.delete(`${API_URL}/api/students/${student.id}`, { headers: { Authorization: `Bearer ${token}` } })
      await fetchData()
      setMessage({ type: 'success', text: `${student.name} was removed from the college directory.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Student could not be removed.' })
    }
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">People directory</p><h1 className="page-title">Students</h1><p className="subtle">Create learner profiles and keep enrollment information current.</p></div><span className="count-pill">{students.length} total</span></div>
      <div className="card form-card">
        <div className="section-heading"><div><h2>Add a student</h2><p className="subtle">A secure login is generated automatically.</p></div></div>
        <form onSubmit={submit} className="form-grid">
          <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maya Patel" /></label>
          <label>Register number<input required value={form.register_number} onChange={(e) => setForm({ ...form, register_number: e.target.value })} placeholder="e.g. STU-2026-001" /></label>
          <label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@school.com" /></label>
          <label>Department<select required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            <option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}
          </select>
          </label><label>Year<input required type="number" min="1" max="8" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></label>
          <label>Section<input required value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" /></label>
          <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save student'}</button>
        </form>
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Student</th><th>Register</th><th>Department</th><th>Email</th>
              <th>Year</th><th>Section</th>{isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.register_number}</td>
                <td>{student.department?.code || '—'}</td>
                <td>{student.email}</td>
                <td>{student.year}</td>
                <td>{student.section}</td>
                {isAdmin && <td><button className="danger-button" type="button" onClick={() => removeStudent(student)} title={`Remove ${student.name}`}>Remove</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function FacultyPage({ token, isAdmin }) {
  const [faculty, setFaculty] = useState([])
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ name: '', designation: '', department_id: '' })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [facultyRes, departmentRes] = await Promise.all([
      axios.get(`${API_URL}/api/faculty`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/api/departments`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
    setFaculty(facultyRes.data)
    setDepartments(departmentRes.data)
    setForm((current) => ({ ...current, department_id: current.department_id || String(departmentRes.data[0]?.id || '') }))
  }

  useEffect(() => { load().catch(() => setMessage({ type: 'error', text: 'Could not load faculty data.' })) }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const response = await axios.post(`${API_URL}/api/faculty`, { ...form, department_id: Number(form.department_id) }, { headers: { Authorization: `Bearer ${token}` } })
      await load()
      setForm({ name: '', designation: '', department_id: departments[0]?.id ? String(departments[0].id) : '' })
      setMessage({ type: 'success', text: `Faculty member added. Login: ${response.data.account.username} · temporary password: welcome123` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Faculty member could not be added.' })
    } finally {
      setSaving(false)
    }
  }

  const removeFaculty = async (member) => {
    if (!window.confirm(`Remove ${member.name} and their linked login? This cannot be undone.`)) return
    try {
      await axios.delete(`${API_URL}/api/faculty/${member.id}`, { headers: { Authorization: `Bearer ${token}` } })
      await load()
      setMessage({ type: 'success', text: `${member.name} was removed from the faculty directory.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Faculty member could not be removed.' })
    }
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">People directory</p><h1 className="page-title">Faculty</h1><p className="subtle">Build your teaching team and assign each member to a department.</p></div><span className="count-pill">{faculty.length} total</span></div>
      <div className="card form-card">
        <div className="section-heading"><div><h2>Add a faculty member</h2><p className="subtle">A faculty login is generated automatically.</p></div></div>
        <form onSubmit={submit} className="form-grid">
          <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dr. Alex Morgan" /></label>
          <label>Designation<input required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Lecturer" /></label>
          <label>Department<select required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}</select></label>
          <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add faculty member'}</button>
        </form>
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}
      </div>
      <div className="table-wrap card">
        <div className="section-heading"><div><h2>Teaching team</h2><p className="subtle">Your active faculty directory.</p></div></div>
        <table><thead><tr><th>Faculty member</th><th>Designation</th><th>Department</th><th>Login</th>{isAdmin && <th>Actions</th>}</tr></thead><tbody>
          {faculty.map((member) => <tr key={member.id}><td><span className="table-avatar">{member.name.slice(0, 1)}</span>{member.name}</td><td>{member.designation}</td><td>{member.department?.code || '—'}</td><td className="muted-cell">{member.user?.username || 'Created account'}</td>{isAdmin && <td><button className="danger-button" type="button" onClick={() => removeFaculty(member)} title={`Remove ${member.name}`}>Remove</button></td>}</tr>)}
        </tbody></table>
      </div>
    </>
  )
}

function CoursesPage({ token }) {
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ code: '', title: '', department_id: '1' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const res = await axios.get(`${API_URL}/api/courses`, { headers: { Authorization: `Bearer ${token}` } })
    setCourses(res.data)
  }

  const submit = async (e) => {
    e.preventDefault()
    await axios.post(`${API_URL}/api/courses`, { ...form, department_id: Number(form.department_id) }, { headers: { Authorization: `Bearer ${token}` } })
    fetchData()
    setForm({ code: '', title: '', department_id: '1' })
  }

  return (
    <>
      <h1 className="page-title">Course Management</h1>
      <div className="card">
        <h3>Add Course</h3>
        <form onSubmit={submit} className="form-grid">
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Course Code" />
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Course Name" />
          <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            <option value="1">CS</option>
            <option value="2">IT</option>
            <option value="3">Mechanical</option>
          </select>
          <button type="submit">Save Course</button>
        </form>
      </div>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>{course.code}</td>
                <td>{course.title}</td>
                <td>{course.department_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function AttendancePage({ token }) {
  const [attendance, setAttendance] = useState([])
  const [form, setForm] = useState({ student_id: '1', course_id: '1', date: '2026-09-21', status: 'Present' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const res = await axios.get(`${API_URL}/api/attendance`, { headers: { Authorization: `Bearer ${token}` } })
    setAttendance(res.data)
  }

  const submit = async (e) => {
    e.preventDefault()
    await axios.post(`${API_URL}/api/attendance`, { ...form, student_id: Number(form.student_id), course_id: Number(form.course_id) }, { headers: { Authorization: `Bearer ${token}` } })
    fetchData()
  }

  return (
    <>
      <h1 className="page-title">Attendance Management</h1>
      <div className="card">
        <h3>Mark Attendance</h3>
        <form onSubmit={submit} className="form-grid">
          <input type="number" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="Student ID" />
          <input type="number" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} placeholder="Course ID" />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
          </select>
          <button type="submit">Save Attendance</button>
        </form>
      </div>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Course ID</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((item) => (
              <tr key={item.id}>
                <td>{item.student_id}</td>
                <td>{item.course_id}</td>
                <td>{item.date}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function MarksPage({ token }) {
  const [marks, setMarks] = useState([])
  const [form, setForm] = useState({ student_id: '1', course_id: '1', exam_type: 'Midterm', score: '85', total: '100' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const res = await axios.get(`${API_URL}/api/marks`, { headers: { Authorization: `Bearer ${token}` } })
    setMarks(res.data)
  }

  const submit = async (e) => {
    e.preventDefault()
    await axios.post(`${API_URL}/api/marks`, { ...form, student_id: Number(form.student_id), course_id: Number(form.course_id), score: Number(form.score), total: Number(form.total) }, { headers: { Authorization: `Bearer ${token}` } })
    fetchData()
  }

  return (
    <>
      <h1 className="page-title">Marks Management</h1>
      <div className="card">
        <h3>Enter Marks</h3>
        <form onSubmit={submit} className="form-grid">
          <input type="number" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="Student ID" />
          <input type="number" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} placeholder="Course ID" />
          <input value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })} placeholder="Exam Type" />
          <input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="Score" />
          <input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="Total" />
          <button type="submit">Save Marks</button>
        </form>
      </div>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Course ID</th>
              <th>Exam</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((mark) => (
              <tr key={mark.id}>
                <td>{mark.student_id}</td>
                <td>{mark.course_id}</td>
                <td>{mark.exam_type}</td>
                <td>{mark.score}/{mark.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default App
