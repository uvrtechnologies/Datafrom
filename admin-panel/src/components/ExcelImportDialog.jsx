import React, { useState } from 'react';
import api from '../services/api';
import { IconAlertCircle, IconCheck, IconFileSpreadsheet, IconX } from './common/Icons';
import { Spinner } from './common/LoadingState';

const SUMMARY_LABELS = [
  ['added', 'Added'],
  ['updated', 'Updated'],
  ['skipped', 'Skipped'],
  ['failed', 'Failed'],
];

export default function ExcelImportDialog({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [clearEmptyCells, setClearEmptyCells] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createPreview = async () => {
    if (!file) {
      setError('Choose an .xlsx or .xls workbook first.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The workbook must be 5 MB or smaller.');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('clearEmptyCells', String(clearEmptyCells));
      const response = await api.post('/import/excel/preview', form);
      setPreview(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not validate this workbook.');
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!preview?.previewId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/import/excel/confirm', { previewId: preview.previewId });
      setResult(response.data.data);
      onImported();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not import these records.');
      if (requestError.response?.data?.data?.errors) {
        setResult({ ...requestError.response.data.data, notImported: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const summary = result?.summary || preview?.summary;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}
    >
      <section
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-import-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="excel-import-title" className="font-serif text-xl font-bold text-navy-900">
              Upload Excel
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Validate and preview changes before they are saved.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close import dialog"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <IconX size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {!result && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1 text-sm font-semibold text-gray-700">
                Excel workbook (.xlsx or .xls)
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={loading}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    setPreview(null);
                    setError('');
                  }}
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-brand-700"
                />
              </label>
              <button
                type="button"
                onClick={createPreview}
                disabled={loading || !file}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
              >
                {loading && !preview ? <Spinner size={15} /> : <IconFileSpreadsheet size={16} />}
                Preview file
              </button>
            </div>
          )}

          {!result && (
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={clearEmptyCells}
                disabled={loading}
                onChange={(event) => {
                  setClearEmptyCells(event.target.checked);
                  setPreview(null);
                }}
                className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Clear optional fields when their Excel cells are empty
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <IconAlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {summary && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SUMMARY_LABELS.map(([key, label]) => (
                <div key={key} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-xs font-medium text-gray-500">{label}</div>
                  <div className="mt-0.5 text-lg font-bold text-navy-900">{summary[key] || 0}</div>
                </div>
              ))}
            </div>
          )}

          {preview && (
            <>
              {preview.canConfirm && (
                <p className="text-xs text-gray-500">
                  Empty optional cells are {clearEmptyCells ? 'set to empty' : 'left unchanged'}.
                  Records missing from this workbook will not be deleted.
                </p>
              )}
              <div className="max-h-[48vh] overflow-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5">Row</th>
                      <th className="px-3 py-2.5">Record ID</th>
                      <th className="px-3 py-2.5">Main Member</th>
                      <th className="px-3 py-2.5">Village / City</th>
                      <th className="px-3 py-2.5">Change</th>
                      <th className="px-3 py-2.5">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.rows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.submissionId}`}>
                        <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.submissionId || '—'}</td>
                        <td className="px-3 py-2">{row.mainMember || '—'}</td>
                        <td className="px-3 py-2">{[row.village, row.city].filter(Boolean).join(', ') || '—'}</td>
                        <td className="px-3 py-2 capitalize">{row.action || '—'}</td>
                        <td className="px-3 py-2">
                          {row.errors.length
                            ? <span className="text-xs text-red-700">{row.errors.join(' ')}</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><IconCheck size={13} /> Valid</span>}
                          {!!row.changes?.length && (
                            <details className="mt-1 max-w-sm text-xs text-gray-500">
                              <summary className="cursor-pointer font-semibold text-brand-700">
                                Review {row.changes.length} changed fields
                              </summary>
                              <dl className="mt-2 space-y-1">
                                {row.changes.map((change) => (
                                  <div key={change.field} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-2">
                                    <dt className="break-all font-medium text-gray-600">{change.field}</dt>
                                    <dd className="break-all whitespace-pre-wrap">{change.value || '—'}</dd>
                                  </div>
                                ))}
                              </dl>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="font-bold text-emerald-800">
                {result.notImported ? 'No records were imported' : 'Import complete'}
              </h3>
              <p className="mt-1 text-sm text-emerald-700">
                Added {result.summary.added}, updated {result.summary.updated}, skipped {result.summary.skipped},
                {' '}failed {result.summary.failed}.
              </p>
              {!!result.errors?.length && (
                <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-red-700">
                  {result.errors.map((item) => (
                    <li key={`${item.rowNumber}-${item.submissionId}`}>
                      Row {item.rowNumber} ({item.submissionId}): {item.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {preview && !result && (
            <button
              type="button"
              onClick={confirmImport}
              disabled={loading || !preview.canConfirm}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? <Spinner size={15} /> : <IconCheck size={16} />}
              Confirm import
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
