import { redirect } from 'next/navigation';

// Registering is part of the camp account: sign up free on /account.
export default function RegisterPage() {
  redirect('/account');
}
