import { useState } from 'react'
import './LoginForm.css'

type LoginFormProps = { saveName: (v: string) => void };

export const LoginForm = (props: LoginFormProps) => {
  const [name, setName] = useState("");

  return (
    <div className="LoginForm">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="enter your name"
        aria-label="username"
        maxlength="20"
      />
      <button onClick={() => { props.saveName(name); } }>Save</button>
    </div>
  );
};
