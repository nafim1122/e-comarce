import "./UserForm.css";
import React, { useState } from "react";
import { addUser } from "../lib/user";

export default function UserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addUser({ uid, name, email });
      setStatus("User added!");
    } catch (err) {
      setStatus("Error adding user");
    }
  };

  return (
  <form onSubmit={handleSubmit} className="user-form-container">
      <h2>Add User</h2>
      <input placeholder="UID" value={uid} onChange={e => setUid(e.target.value)} required />
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <button type="submit">Add User</button>
      <div>{status}</div>
    </form>
  );
}
