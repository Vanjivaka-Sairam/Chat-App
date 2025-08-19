import { useEffect, useState } from "react";

const HomePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/users")
      .then(res => res.json())        // parse JSON
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}

export default HomePage;
