'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Account } from '@/lib/types/account';

import TransactionForm from '../transaction-form';

export default function NewTransactionClient({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <TransactionForm
        accounts={accounts}
        onSaved={() => {
          router.replace('/transactions');
          router.refresh();
        }}
        onError={setServerError}
      />
      {serverError ? <p className="text-negative text-xs">{serverError}</p> : null}
      <Link href="/transactions" className="text-muted hover:text-foreground self-start text-xs">
        ← Back to transactions
      </Link>
    </div>
  );
}
