import {
  Home,
  PlusCircle,
  FileText,
  Megaphone,
  Bell,
  ShieldCheck,
  Phone,
  Settings,
  ClipboardList,
  Clock3,
  CheckCircle,
  Flame,
  Waves,
  Car,
  Zap,
  Trash2,
  Droplets,
  MapPin,
  Menu,
  X,
  User
} from "lucide-react";

import { useState } from "react";

import "./index.css";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const emergencyTypes = [
    {
      name: "Fire",
      icon: <Flame />,
      className: "fire"
    },
    {
      name: "Flood",
      icon: <Waves />,
      className: "flood"
    },
    {
      name: "Accident",
      icon: <Car />,
      className: "accident"
    },
    {
      name: "Electrical Hazard",
      icon: <Zap />,
      className: "electrical"
    },
    {
      name: "Garbage Collection",
      icon: <Trash2 />,
      className: "garbage"
    },
    {
      name: "Road Damage",
      icon: <MapPin />,
      className: "road"
    },
    {
      name: "Water Problems",
      icon: <Droplets />,
      className: "water"
    }
  ];

  return (
    <div className="app">

      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <div className="mobile-logo">
          <div className="logo-shield">A</div>
          <div>
            <h2>AlertBarangay</h2>
            <span>Safer Community, Together</span>
          </div>
        </div>

        <button
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className={`sidebar ${menuOpen ? "show" : ""}`}>

        <div className="brand">
          <div className="brand-logo">
            A
          </div>

          <div>
            <h2>AlertBarangay</h2>
            <p>Safer Community, Together</p>
          </div>
        </div>

        <nav>

          <a className="nav-item active">
            <Home size={22} />
            <span>Dashboard</span>
          </a>

          <a className="nav-item">
            <PlusCircle size={22} />
            <span>Report Emergency</span>
          </a>

          <a className="nav-item">
            <FileText size={22} />
            <span>My Reports</span>
          </a>

          <a className="nav-item">
            <Megaphone size={22} />
            <span>Announcements</span>
          </a>

          <a className="nav-item">
            <Bell size={22} />
            <span>Notifications</span>

            <span className="notification-number">3</span>
          </a>

          <a className="nav-item">
            <ShieldCheck size={22} />
            <span>Safety Tips</span>
          </a>

          <a className="nav-item">
            <Phone size={22} />
            <span>Barangay Contacts</span>
          </a>

          <a className="nav-item">
            <Settings size={22} />
            <span>Settings</span>
          </a>

        </nav>

        <div className="emergency-box">

          <h3>In Case of Emergency</h3>

          <p>Call Barangay Hotline</p>

          <strong>
            <Phone size={18} />
            (02) 8123-4567
          </strong>

        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="main">

        {/* TOP HEADER */}
        <header className="top-header">

          <div>
            <h1>
              Welcome back, Juan Dela Cruz! 👋
            </h1>

            <p>
              Let's keep our barangay safe and prepared.
            </p>
          </div>

          <div className="profile-area">

            <div className="header-notification">
              <Bell />
              <span></span>
            </div>

            <div className="profile">

              <div className="profile-image">
                <User />
              </div>

              <div className="profile-info">
                <strong>Juan Dela Cruz</strong>
                <small>Resident</small>
              </div>

              <span className="arrow">⌄</span>

            </div>

          </div>

        </header>

        {/* DASHBOARD CONTENT */}
        <div className="content">

          {/* STAT CARDS */}
          <section className="stats">

            <div className="stat-card">

              <div className="stat-icon green">
                <ClipboardList />
              </div>

              <div>
                <h2>3</h2>
                <strong>My Reports</strong>
                <p>View your submitted reports</p>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon yellow">
                <Clock3 />
              </div>

              <div>
                <h2>2</h2>
                <strong>In Progress</strong>
                <p>Reports being reviewed</p>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon red">
                <CheckCircle />
              </div>

              <div>
                <h2>5</h2>
                <strong>Resolved</strong>
                <p>Reports that were resolved</p>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon blue">
                <Bell />
              </div>

              <div>
                <h2>3</h2>
                <strong>Notifications</strong>
                <p>Unread notifications</p>
              </div>

            </div>

          </section>


          {/* TWO COLUMN SECTION */}
          <section className="dashboard-grid">

            {/* LEFT */}
            <div>

              {/* REPORT EMERGENCY */}
              <div className="panel report-panel">

                <h2>Report an Emergency</h2>

                <p className="panel-description">
                  What would you like to report?
                </p>

                <div className="emergency-grid">

                  {emergencyTypes.map((type) => (

                    <button
                      className="emergency-card"
                      key={type.name}
                    >

                      <div className={`emergency-icon ${type.className}`}>
                        {type.icon}
                      </div>

                      <span>{type.name}</span>

                    </button>

                  ))}

                </div>

              </div>


              {/* RECENT REPORTS */}
              <div className="panel recent-panel">

                <div className="panel-heading">

                  <div>
                    <h2>Recent Reports in Your Area</h2>
                  </div>

                  <button className="view-all">
                    View All
                  </button>

                </div>

                <div className="table-container">

                  <table>

                    <thead>

                      <tr>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Reported At</th>
                      </tr>

                    </thead>

                    <tbody>

                      <tr>

                        <td>
                          <span className="type-icon">🌊</span>
                          Flood
                        </td>

                        <td>Zone 4</td>

                        <td>
                          <span className="badge high">
                            High
                          </span>
                        </td>

                        <td>
                          <span className="badge progress">
                            In Progress
                          </span>
                        </td>

                        <td>
                          May 20, 2025 9:15 AM
                        </td>

                      </tr>

                      <tr>

                        <td>
                          <span className="type-icon">🛣️</span>
                          Road Damage
                        </td>

                        <td>Zone 2</td>

                        <td>
                          <span className="badge medium">
                            Medium
                          </span>
                        </td>

                        <td>
                          <span className="badge resolved">
                            Resolved
                          </span>
                        </td>

                        <td>
                          May 19, 2025 4:30 PM
                        </td>

                      </tr>

                      <tr>

                        <td>
                          <span className="type-icon">🗑️</span>
                          Garbage Collection
                        </td>

                        <td>Zone 6</td>

                        <td>
                          <span className="badge low">
                            Low
                          </span>
                        </td>

                        <td>
                          <span className="badge resolved">
                            Resolved
                          </span>
                        </td>

                        <td>
                          May 18, 2025 10:20 AM
                        </td>

                      </tr>

                    </tbody>

                  </table>

                </div>

              </div>

            </div>


            {/* RIGHT COLUMN */}
            <div className="right-column">

              {/* HOTLINE */}
              <div className="panel hotline-panel">

                <h2>Emergency Hotline</h2>

                <p className="panel-description">
                  Need immediate assistance?
                </p>

                <div className="hotline">

                  <Phone />

                  <div>
                    <strong>(02) 8123-4567</strong>
                    <span>Barangay Emergency Hotline</span>
                  </div>

                </div>

                <p className="available">
                  Available 24/7
                </p>

              </div>


              {/* SAFETY REMINDER */}
              <div className="panel safety-panel">

                <h2>
                  <ShieldCheck />
                  Safety Reminder
                </h2>

                <ul>

                  <li>
                    Stay alert and aware of your surroundings.
                  </li>

                  <li>
                    Report emergencies immediately.
                  </li>

                  <li>
                    Let's work together for a safer barangay.
                  </li>

                </ul>

                <div className="quote">
                  “Bayanihan at Malasakit,
                  <br />
                  Kaligtasan ay Makakamtan.”
                </div>

              </div>

            </div>

          </section>

        </div>

        <footer>
          © 2025 AlertBarangay. All rights reserved.
        </footer>

      </main>

    </div>
  );
}

export default App;