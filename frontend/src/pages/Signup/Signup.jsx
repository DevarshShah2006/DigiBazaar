import SignupForm from "../../components/Auth/SignupForm";

const Signup = () => {

  const handleSignup = (formData) => {

    console.log("New User:", formData);

    alert("Account Created Successfully!");

    // Day 2
    // Call signup API
    // Navigate to Login page
  };

  return (
    <div className="signup-page">
      <SignupForm onSubmit={handleSignup} />
    </div>
  );
};

export default Signup;