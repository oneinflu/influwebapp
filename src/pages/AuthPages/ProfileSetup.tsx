import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ProfileSetupForm from "../../components/auth/ProfileSetupForm";

export default function ProfileSetup() {
  return (
    <>
      <PageMeta
        title="Profile Setup | TailAdmin"
        description="Provide slug, display name, and date of birth to complete registration."
      />
      <AuthLayout>
        <ProfileSetupForm />
      </AuthLayout>
    </>
  );
}