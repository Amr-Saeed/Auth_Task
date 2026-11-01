import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { FormErrors } from "../components/FormErrors";
import { PasswordChecklist } from "../components/PasswordChecklist";
import { TextField } from "../components/TextField";
import { ApiError } from "../lib/api";
import { signUpSchema, type SignUpValues } from "../lib/validation";

export function SignUpPage() {
  const { signUp } = useAuth();
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
  });
  const password = useWatch({ control, name: "password", defaultValue: "" });

  const onSubmit = handleSubmit(async (values) => {
    setServerErrors([]);
    try {
      await signUp(values);
    } catch (error) {
      setServerErrors(
        error instanceof ApiError ? error.messages : ["Something went wrong"],
      );
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It only takes a moment."
      footer={
        <>
          Already have an account? <Link to="/signin">Sign in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FormErrors messages={serverErrors} />
        <TextField
          label="Name"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={
            errors.password?.type === "custom"
              ? "Password does not meet the requirements below"
              : errors.password?.message
          }
          {...register("password")}
        >
          <PasswordChecklist value={password} />
        </TextField>
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </AuthLayout>
  );
}
