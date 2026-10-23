import { redirect } from 'next/navigation';

// Registering is now part of the camp account: sign up, pay by transfer, upload the receipt.
export default function RegisterPage() {
  redirect('/account');
}
