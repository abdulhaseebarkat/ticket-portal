import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmployees, fetchGroups, simulateWhatsApp } from '../lib/api';

interface Group {
  id: number;
  name: string;
}
interface Employee {
  id: number;
  name: string;
}

const scenarios = [
  { label: 'Scenario 1 — Scanner Complaint', message: 'TB-024 ka scanner kaam nahi kar raha' },
  { label: 'Scenario 2 — HMI Complaint', message: 'Curing line 4 ka HMI PC hang ho gaya hai' },
  { label: 'Scenario 3 — Zebra Printer', message: 'Zebra printer 2 print nahi kar raha' },
  { label: 'Scenario 4 — Network', message: 'TB-018 machine pe internet nahi chal raha' },
  { label: 'Scenario 5 — Technician In Progress', message: 'TB-024 scanner check kar raha hoon' },
  { label: 'Scenario 6 — Technician Resolution', message: 'TB-024 scanner ka USB loose tha, reconnect kar diya. Ab working hai.' },
  { label: 'Scenario 7 — Worker Reopens', message: 'Scanner abhi bhi kaam nahi kar raha' }
];

export default function WhatsAppSimulatorPage() {
  const { data: groups } = useQuery<Group[]>({ queryKey: ['whatsappGroups'], queryFn: fetchGroups });
  const { data: employees } = useQuery<Employee[]>({ queryKey: ['employees'], queryFn: fetchEmployees });

  const [group, setGroup] = useState('');
  const [employee, setEmployee] = useState('');
  const [message, setMessage] = useState('TB-024 ka scanner kaam nahi kar raha');
  const [status, setStatus] = useState('Ready to simulate new message');

  // Default the dropdowns to the first real group/employee once they load.
  useEffect(() => {
    if (!group && groups && groups.length > 0) {
      setGroup(groups[0].name);
    }
  }, [groups, group]);
  useEffect(() => {
    if (!employee && employees && employees.length > 0) {
      setEmployee(employees[0].name);
    }
  }, [employees, employee]);

  const handleSend = async () => {
    if (!group || !employee) {
      setStatus('Add at least one WhatsApp group and employee before simulating a message.');
      return;
    }
    try {
      await simulateWhatsApp({ groupName: group, employeeName: employee, message });
      setStatus(`Simulated message sent from ${employee} in ${group}.`);
    } catch (error) {
      setStatus('Unable to send simulated message.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-slate-500">WhatsApp Simulator</div>
            <h1 className="mt-3 text-3xl font-semibold text-white">Simulate incoming WhatsApp complaint messages</h1>
            <p className="mt-2 text-slate-400">Use the simulator to add mock group reports and demonstrate automatic complaint processing.</p>
          </div>
          <div className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-200">Status: {status}</div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_0.6fr]">
        <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
          <div className="space-y-6">
            <div>
              <label className="text-sm text-slate-300">Group</label>
              {groups && groups.length > 0 ? (
                <select value={group} onChange={(e) => setGroup(e.target.value)} className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-200 outline-none">
                  {groups.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500">
                  No WhatsApp groups yet — add one via the WhatsApp Groups page first.
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-slate-300">Employee</label>
              {employees && employees.length > 0 ? (
                <select value={employee} onChange={(e) => setEmployee(e.target.value)} className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-200 outline-none">
                  {employees.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500">
                  No employees on record yet.
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-slate-300">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="mt-3 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-200 outline-none"
              />
            </div>
            <button onClick={handleSend} className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
              Send Simulated WhatsApp Message
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Demo scenarios</h2>
              <p className="mt-2 text-sm text-slate-400">Select a scenario to populate the simulator quickly.</p>
            </div>
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.label}
                  onClick={() => setMessage(scenario.message)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  <div className="font-medium text-white">{scenario.label}</div>
                  <div className="mt-1 text-slate-400">{scenario.message}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
