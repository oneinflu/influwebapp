import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="INFLU - Sign In"
        description="The Smarter Way to Manage Creators, Clients & Closures.”"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
