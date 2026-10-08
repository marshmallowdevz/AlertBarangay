export const initialReports = [
  {
    id: 'AB-2401',
    type: 'Fire',
    severity: 'High',
    status: 'In progress',
    location: 'Purok 2, San Roque',
    time: '8 minutes ago',
    description: 'Smoke reported near a residential property. Responders are checking nearby households.',
    dispatchHistory: [],
  },
  {
    id: 'AB-2398',
    type: 'Medical',
    severity: 'Medium',
    status: 'Assigned',
    location: 'Barangay Hall',
    time: '18 minutes ago',
    description: 'A resident requested medical assistance at the barangay hall.',
    dispatchHistory: [],
  },
  {
    id: 'AB-2395',
    type: 'Flooding',
    severity: 'High',
    status: 'Monitoring',
    location: 'River Road',
    time: '31 minutes ago',
    description: 'Water is rising along River Road. Nearby households are being monitored.',
    dispatchHistory: [],
  },
  {
    id: 'AB-2392',
    type: 'Power',
    severity: 'Low',
    status: 'Resolved',
    location: 'Sitio Kalayaan',
    time: '1 hour ago',
    description: 'A reported power interruption has been resolved.',
    dispatchHistory: [],
  },
];

export const initialResidents = [
  { id: 'RES-001', name: 'Maria Santos', purok: 'Purok 1', address: '12 Mabini Street, San Roque', phone: '0917-555-0101' },
  { id: 'RES-002', name: 'Jose Reyes', purok: 'Purok 2', address: '8 Rizal Avenue, San Roque', phone: '0917-555-0102' },
  { id: 'RES-003', name: 'Ana Cruz', purok: 'Purok 3', address: '24 Bonifacio Street, San Roque', phone: '0917-555-0103' },
  { id: 'RES-004', name: 'Ramon Garcia', purok: 'Purok 4', address: '5 Del Pilar Road, San Roque', phone: '0917-555-0104' },
  { id: 'RES-005', name: 'Liza Mendoza', purok: 'Purok 5', address: '17 Mabuhay Lane, San Roque', phone: '0917-555-0105' },
];

export const initialConversations = [
  {
    id: 'MSG-001',
    residentId: 'RES-001',
    residentName: 'Maria Santos',
    messages: [
      { id: 'MSG-001-1', sender: 'Maria Santos', body: 'There is smoke near the corner of Mabini Street.', createdAt: '2026-10-08T10:12:00+08:00' },
      { id: 'MSG-001-2', sender: 'Barangay Official', body: 'Thank you. Responders are checking the area now.', createdAt: '2026-10-08T10:15:00+08:00' },
    ],
  },
  {
    id: 'MSG-002',
    residentId: 'RES-003',
    residentName: 'Ana Cruz',
    messages: [
      { id: 'MSG-002-1', sender: 'Ana Cruz', body: 'Can you confirm whether the health center is open today?', createdAt: '2026-10-08T09:40:00+08:00' },
    ],
  },
];
