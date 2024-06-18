import { useState } from 'react'

type LoginFormProps = { saveName: (v: string) => void };

export const LoginForm = (props: LoginFormProps) => {
  const [name, setName] = useState("");

  return (
    <div className="LoginForm">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Username"
        aria-label="username"
      />
      <button onClick={() => { props.saveName(name); } }>Save</button>
    </div>
  );
};
