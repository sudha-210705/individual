import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

const API_URL = 'https://individual-wp27.onrender.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [riderProfile, setRiderProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          setRiderProfile(data.riderProfile);
        } else {
          setUser(null);
          setRiderProfile(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
      if (data.token) {
        sessionStorage.setItem('token', data.token);
      }

      setUser(data.user);

      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const meData = await meRes.json();

      if (meData.success) {
        setUser(meData.user);
        setRiderProfile(meData.riderProfile);
      }

      return { success: true };
    }

    return { success: false, message: data.message };
  };

  const register = async (userData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await res.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, message: data.message };
  };

  const logout = async () => {
    sessionStorage.removeItem('token');

    await fetch(`${API_URL}/auth/logout`);

    setUser(null);
    setRiderProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        setUser,
        riderProfile,
        setRiderProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;