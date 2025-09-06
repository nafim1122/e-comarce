import React, { useEffect, useState } from "react";
import { getUsers } from "../lib/user";
import { User } from "../types";
import "./UserList.css";

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  return (
  <div className="user-list-container">
      <h2>User List</h2>
      <ul>
        {users.map((user, idx) => (
          <li key={idx}>{user.name} ({user.email})</li>
        ))}
      </ul>
    </div>
  );
}
