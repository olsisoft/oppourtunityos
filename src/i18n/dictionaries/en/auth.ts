/** English strings — section "auth". Keys are referenced as "auth.<key>". */
export const auth = {
  login: {
    metaTitle: "Sign in",
    title: "Sign in",
    description: "Continue your opportunity discovery.",
    demoAccountBefore: "Demo account (after",
    demoAccountAfter: "):",
  },
  register: {
    metaTitle: "Create account",
    title: "Create your account",
    description: "Discover problems worth solving. Hypotheses stay separate from evidence.",
  },
  form: {
    name: "Name",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    createAccount: "Create account",
    noAccount: "No account?",
    createOne: "Create one",
    alreadyRegistered: "Already registered?",
  },
  errors: {
    emailTaken: "An account with this email already exists.",
    missingCredentials: "Enter your email and password.",
    invalidCredentials: "Invalid email or password.",
  },
} as const;
