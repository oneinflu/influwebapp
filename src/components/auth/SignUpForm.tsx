
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Alert from "../ui/alert/Alert";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

export default function SignUpForm() {
  const [isChecked, setIsChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [primaryRole, setPrimaryRole] = useState<
    "agency" | "model" | "business" | "manager" | "influencer" | null
  >(null);
  const navigate = useNavigate();
  const { registerUser, loading } = useAuth();
  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <a
          href="https://oneinflu.com"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          rel="noopener noreferrer"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </a>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Provide your name, country, email, phone, and password to register.
            </p>
          </div>
          <div>
           
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setApiError(null);
                try {
                  if (!primaryRole) {
                    throw new Error("Please choose what defines you");
                  }
                  await registerUser(
                    name.trim(),
                    country.trim(),
                    email.trim(),
                    phone.trim(),
                    isChecked,
                    primaryRole
                  );
                  navigate("/profile-setup");
                } catch (err: unknown) {
                  let msg = "Registration failed";
                  if (typeof err === "object" && err !== null) {
                    const maybe = err as { response?: { data?: { message?: string } }; message?: string };
                    msg = maybe.response?.data?.message ?? (typeof maybe.message === "string" ? maybe.message : msg);
                  }
                  setApiError(msg);
                  console.error(err);
                }
              }}
            >
              <div className="space-y-5">
                {apiError && (
                  <Alert variant="error" title="Cannot proceed" message={apiError} />
                )}
                {/* Name */}
                <div>
                  <Label>
                    Name<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {/* What defines you (Primary role) */}
                <div>
                  <Label>
                    What defines you <span className="text-error-500">*</span>
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { label: "I run a brand promotion agency", value: "agency" },
                      { label: "I am model", value: "model" },
                      { label: "I run a business", value: "business" },
                      {
                        label: "I’m a manager who deals with influencers & brands",
                        value: "manager",
                      },
                      { label: "I am a Content Creator", value: "influencer" },
                    ].map((opt) => {
                      const selected = primaryRole === opt.value;
                      const base = "px-3 py-1 rounded-full border text-sm transition";
                      const selectedClasses =
                        " bg-brand-500 text-white border-brand-500 dark:bg-brand-500 dark:text-white dark:border-brand-500";
                      const unselectedClasses =
                        " bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-white/5 dark:text-white/80 dark:border-gray-700 dark:hover:bg-white/10";
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPrimaryRole(opt.value as typeof primaryRole)}
                          className={`${base}${selected ? selectedClasses : unselectedClasses}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    We only show the main roles here: agency, model, business, manager, influencer.
                  </p>
                </div>
                {/* Password */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Enter a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                {/* Country */}
                <div>
                  <Label>
                    Country<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="country"
                    name="country"
                    placeholder="Enter your country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                {/* Phone */}
                <div>
                  <Label>
                    Phone<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                {/* <!-- Checkbox --> */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    By creating an account means you agree to the{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Terms and Conditions,
                    </span>{" "}
                    and our{" "}
                    <span className="text-gray-800 dark:text-white">
                      Privacy Policy
                    </span>
                  </p>
                </div>
                {/* <!-- Button --> */}
                <div>
                  <button
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Signing up..." : "Sign Up"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account? {""}
                <Link
                  to="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
