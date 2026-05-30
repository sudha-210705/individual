import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Cpu, HelpCircle, Plus } from 'lucide-react';

export default function SupportCenter() {
  const { user } = useAuth();
  
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewTab, setViewTab] = useState('tickets');

  const faqs = [
    { q: 'How does AI route optimization work?', a: 'The AI analyzes the list of stop locations and orders them so that the rider covers the shortest possible distance.' },
    { q: 'What is surge pricing?', a: 'Surge pricing is an automatic fare adjustment triggered when order volume exceeds active rider count, or during rain.' },
    { q: 'What is Aether Wallet?', a: 'A mock wallet preloaded with credits that allows customers to test order bookings and simulated rider coordinate movements.' }
  ];

  const fetchTicketsList = () => {
    fetch(`${API/_URL}/api/tickets`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTickets(data.tickets);
          if (data.tickets.length > 0 && !activeTicket) {
            setActiveTicket(data.tickets[0]);
          }
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchTicketsList();
    const interval = setInterval(fetchTicketsList, 5000); // Polling chat updates
    return () => clearInterval(interval);
  }, [activeTicket]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, messageText: message })
      });
      const data = await res.json();
      if (data.success) {
        setSubject('');
        setMessage('');
        fetchTicketsList();
        setActiveTicket(data.ticket);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeTicket) return;
    const txt = chatInput;
    setChatInput('');

    try {
      const res = await fetch(`${API_URL}/api/tickets/${activeTicket._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: txt })
      });
      const data = await res.json();
      if (data.success) {
        fetchTicketsList();
        // Sync active ticket view state
        setActiveTicket(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, { sender: user._id, text: txt, timestamp: new Date() }]
          };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start h-full">
      
      {/* Left deck selector */}
      <div className="md:col-span-4 flex flex-col gap-6">
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setViewTab('tickets')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              viewTab === 'tickets' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-500 hover:text-white'
            }`}
          >
            {user.role === 'admin' ? 'Support Queue' : 'Active Tickets'}
          </button>
          <button
            onClick={() => setViewTab('faq')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              viewTab === 'faq' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-white'
            }`}
          >
            System FAQ
          </button>
        </div>

        {viewTab === 'tickets' ? (
          <>
            {/* Raise ticket form */}
            {user.role !== 'admin' && (
              <div className="glass-panel p-5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-4">
                  Raise Support Link
                </h3>
                <form onSubmit={handleCreateTicket} className="flex flex-col gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Ticket Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <textarea
                    required
                    rows="3"
                    placeholder="Describe your issue..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none resize-none"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-cyan-500 text-slate-950 font-bold text-xs uppercase hover:opacity-85"
                  >
                    Send Ticket
                  </button>
                </form>
              </div>
            )}

            {/* List tickets */}
            <div className="glass-panel p-5 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                {user.role === 'admin' ? 'Incoming Tickets' : 'Your Tickets'}
              </h3>
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                {tickets.length === 0 ? (
                  <p className="text-[10px] text-slate-500 uppercase p-4 text-center">NO TICKETS CREATED</p>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t._id}
                      onClick={() => setActiveTicket(t)}
                      className={`p-2.5 rounded border text-xs cursor-pointer transition-all flex justify-between items-center ${
                        activeTicket?._id === t._id 
                          ? 'border-cyan-500 bg-cyan-500/5' 
                          : 'border-slate-850 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white uppercase text-[10px] tracking-wider truncate max-w-[120px]">{t.subject}</p>
                        <span className="text-[9px] text-slate-500">
                          {user.role === 'admin' && t.user ? `${t.user.name} (${t.user.role})` : `ID: ...${t._id.substring(18)}`}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        t.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          /* FAQs */
          <div className="glass-panel p-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-white uppercase border-b border-slate-800 pb-2">
              HELP DIRECTORY
            </h3>
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-slate-800 pb-2 flex flex-col gap-1">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> {faq.q}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Right Column active message logs */}
      <div className="md:col-span-8">
        {activeTicket ? (
          <div 
            className="glass-panel h-[72vh] flex flex-col justify-between overflow-hidden"
            style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.08)', border: '1px solid rgba(71, 85, 105, 0.5)' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                  TICKET THREAD: {activeTicket.subject}
                </h4>
                <span className="text-[9px] text-slate-500">Secure link id: {activeTicket._id}</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-[9px] text-cyan-400 uppercase font-bold">AI Helper Monitoring</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {activeTicket.messages.map((m, index) => {
                const isAI = m.text.startsWith('[AETHER AI') || m.text.startsWith('[AETHER AI CONTROLLER]');
                const isMe = m.sender === user._id && !isAI;
                const isOwner = activeTicket.user && (m.sender === activeTicket.user._id || m.sender === activeTicket.user);
                
                let senderLabel = 'ADMINISTRATOR';
                if (isAI) {
                  senderLabel = 'Æ AI AGENT';
                } else if (isMe) {
                  senderLabel = 'YOU';
                } else if (isOwner) {
                  const ownerName = typeof activeTicket.user === 'object' ? activeTicket.user.name : 'USER';
                  const ownerRole = typeof activeTicket.user === 'object' ? (activeTicket.user.role || '').toUpperCase() : 'USER';
                  senderLabel = `${ownerName} (${ownerRole})`;
                }
                
                return (
                  <div 
                    key={index}
                    className={`flex flex-col gap-1 max-w-[70%] ${
                      isMe ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <span className="text-[9px] text-slate-500 font-mono">
                      {senderLabel} // {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                    <div className={`p-3 rounded-lg text-xs border ${
                      isAI
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                        : isMe
                          ? 'bg-purple-500/10 border-purple-500/20 text-white'
                          : 'bg-slate-900 border-slate-850 text-slate-300'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/40 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask support bot..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-5 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:opacity-85 transition-opacity"
              >
                Send
              </button>
            </form>

          </div>
        ) : (
          <div className="glass-panel h-[72vh] flex items-center justify-center text-center p-6 text-slate-500 text-xs">
            SELECT A TICKET COMMS DECK ON THE LEFT GRID PANEL TO READ TRANSMISSIONS OR START A NEW ONE.
          </div>
        )}
      </div>

    </div>
  );
}
