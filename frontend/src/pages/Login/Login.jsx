import LoginForm from "../../components/Auth/LoginForm";

const Login = () => {

  const handleLogin = (formData) => {

    console.log("User Data:", formData);

    alert("Login Successful!");

    // Day 2
    // login API
    // navigate("/")
  };

  return (
    <div className="login-page">

      <LoginForm
        onSubmit={handleLogin}
      />

    </div>
  );
};

export default Login;