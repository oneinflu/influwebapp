import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import BusinessInfoForm from "../../components/auth/BusinessInfoForm";

export default function BusinessInfo() {
  return (
    <>
      <PageMeta
        title="INFLU CRM"
        description="Provide your business details to complete onboarding."
      />
      <AuthLayout>
        <div className="w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Business Information
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If you selected Agency or Business, please share a few details.
            </p>
          </div>
          <BusinessInfoForm />
        </div>
      </AuthLayout>
    </>
  );
}
