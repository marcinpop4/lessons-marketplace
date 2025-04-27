import React, { useState } from 'react';
import LessonRateList from './LessonRateList';
import LessonRateForm from './LessonRateForm';
import apiClient from '../../../api/apiClient';
import axios from 'axios';
import './TeacherLessonRatesManager.css';

// Import the shared model instead of the local interface
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate.js';
import { LessonType } from '@shared/models/LessonType.js'; // Ensure LessonType is imported if needed
import { TeacherLessonHourlyRateStatusTransition, TeacherLessonHourlyRateStatusValue } from '@shared/models/TeacherLessonHourlyRateStatus.js';

// Remove the local LessonRate interface
/*
interface LessonRate {
  id: string;
  type: string;
  rateInCents: number;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
*/

interface Props {
  // Use the shared model type for the prop
  lessonRates: TeacherLessonHourlyRate[];
  onRatesUpdated: (rates: TeacherLessonHourlyRate[]) => void;
}

// Use the shared model type for state and function parameters
const TeacherLessonRatesManager: React.FC<Props> = ({ lessonRates = [], onRatesUpdated }) => {
  const [editingRate, setEditingRate] = useState<TeacherLessonHourlyRate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddOrUpdate = async (rateData: Partial<TeacherLessonHourlyRate>) => { // Use shared model partial
    try {
      setError(null);

      const apiPayload = {
        lessonType: rateData.type,
        rateInCents: rateData.rateInCents,
        // Pass ID directly if editingRate exists
        ...(editingRate ? { id: editingRate.id } : {})
      };

      // API returns data that should conform to TeacherLessonHourlyRateProps
      const response = await apiClient.post('/api/v1/teacher-lesson-rates', apiPayload);
      // Instantiate the shared model from the response data
      const updatedRateInstance = new TeacherLessonHourlyRate(response.data);

      // Update the rates list with the new instance
      let updatedRates: TeacherLessonHourlyRate[];
      if (editingRate) {
        updatedRates = lessonRates.map(r =>
          r.id === editingRate!.id ? updatedRateInstance : r // Use non-null assertion or check
        );
      } else {
        updatedRates = [...lessonRates, updatedRateInstance];
      }
      onRatesUpdated(updatedRates);

      setEditingRate(null);
    } catch (err) {
      // ... (error handling remains largely the same) ...
      if (axios.isAxiosError(err)) {
        const status = err.response?.status || 0;
        const apiError = err.response?.data?.message || err.message;
        if (status === 409) {
          setError(`You already have a rate for ${rateData.type} lessons. Please edit the existing rate instead.`);
        } else if (status === 400) {
          setError(`Failed to save lesson rate: ${apiError}`);
        } else if (status >= 500) {
          setError('Server error occurred. Please try again later.');
        } else {
          setError(`Failed to save lesson rate: ${apiError}`);
        }
      } else {
        setError('Failed to save lesson rate. Please try again.');
      }
      console.error('Error saving lesson rate:', err);
    }
  };

  // Use TeacherLessonHourlyRate for the rate parameter
  const handleToggleActive = async (rate: TeacherLessonHourlyRate) => {
    try {
      setError(null);

      // Determine the TARGET status based on the current state
      const targetStatus = rate.isActive()
        ? TeacherLessonHourlyRateStatusValue.INACTIVE
        : TeacherLessonHourlyRateStatusValue.ACTIVE;

      // Use the new endpoint: PATCH /api/v1/teacher-lesson-rates/:id
      const endpoint = `/api/v1/teacher-lesson-rates/${rate.id}`;

      // Send the target status in the payload
      const apiPayload = {
        status: targetStatus
        // Context could be added here if needed: context: { reason: 'User toggle' }
      };

      // Make a PATCH request to the new endpoint
      const response = await apiClient.patch(endpoint, apiPayload);

      // Instantiate the updated rate from the response
      const updatedRateInstance = new TeacherLessonHourlyRate(response.data);

      // Update the rates list with the new instance
      const updatedRates = lessonRates.map(r =>
        r.id === rate.id ? updatedRateInstance : r // Update based on ID
      );
      onRatesUpdated(updatedRates);

    } catch (err) {
      // ... (error handling) ...
      if (axios.isAxiosError(err)) {
        const status = err.response?.status || 0;
        const apiError = err.response?.data?.message || err.message;
        // ... (handle specific status codes) ...
        if (status === 400) { // Example: Handle BadRequest from controller
          setError(`Failed to update status: ${apiError}`);
        } else {
          setError(`Failed to update lesson rate status: ${apiError}`);
        }
      } else {
        setError('Failed to update lesson rate status. Please try again.');
      }
      console.error('Error updating lesson rate status:', err);
    }
  };

  // Use TeacherLessonHourlyRate for the rate parameter
  const handleEdit = (rate: TeacherLessonHourlyRate) => {
    setEditingRate(rate);
  };

  const handleCancel = () => {
    setEditingRate(null);
  };

  return (
    <div className="lesson-rates-manager">
      <h2 className="text-2xl font-semibold mb-6">Lesson Rates Management</h2>
      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="rates-layout">
        <div className="rates-form-container">
          <div className="card card-accent">
            <div className="card-header">
              <h3 className="text-xl font-semibold">Add New Rate</h3>
            </div>
            <div className="card-body">
              <LessonRateForm
                // Pass TeacherLessonHourlyRate | null to form
                rate={editingRate}
                onSubmit={handleAddOrUpdate}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>

        <div className="rates-list-container">
          <div className="card card-accent">
            <div className="card-header">
              <h3 className="text-xl font-semibold">Your Lesson Rates</h3>
            </div>
            <div className="card-body">
              <LessonRateList
                // Pass TeacherLessonHourlyRate[] to list
                rates={lessonRates}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLessonRatesManager; 