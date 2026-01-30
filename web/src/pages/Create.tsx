import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { AIInput } from '@/components/Prompt';
import type { AIInputData } from '@/components/Prompt';
import ProcessingModal from '@/components/ProcessingModal';
import Animate from '@/components/Animate';
import { useData } from '@/lib/dataContext';
import type { Data } from '@/lib/types';
import { useFolders } from '@/lib/queries';
import { generateApi } from '@/lib/api';

interface ApiErrorResponse {
  error: string;
  message: string;
}

export function Create() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const datas = useData();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Fetch folders for the dropdown
  const { data: foldersData } = useFolders();
  const folders = foldersData?.folders || [];

  async function onSubmit(data: AIInputData) {
    setIsLoading(true);
    try {
      const resp = await generateApi.create({
        prompt: data.text,
        ...data.options,
        turnstile: data.turnstile,
        folder_id: data.folderId,
      });

      const newEntry: Data = resp.data as Data;
      datas.updateData([...datas.data, newEntry]);

      toast.success(t('toast.materialReady'));
      navigate(`/${newEntry.id}`);
    } catch (err) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        // Handle timeout error specifically
        if (err.code === 'ECONNABORTED') {
          toast.error(t('errors.timeout'));
          return;
        }

        const status = err.status ?? err.response?.status;
        const apiError = err.response?.data;
        const errorMsg = apiError?.message ?? err.message;

        if (status === 400) {
          toast.error(`${t('errors.generic')}: ${errorMsg}`);
          return;
        }

        if (status && status >= 500) {
          toast.error(`${t('errors.generic')}: ${errorMsg}`);
          return;
        }

        toast.error(`${t('errors.generic')} (${status}): ${errorMsg}`);
      } else {
        toast.error(t('errors.network'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="relative min-h-[calc(100vh-200px)] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            {t('create.title')}
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            {t('create.subtitle')}
          </p>
        </div>

        <Animate>
          <AIInput onSubmit={onSubmit} folders={folders} />
        </Animate>

        <ProcessingModal isOpen={isLoading} />
      </div>
    </section>
  );
}
