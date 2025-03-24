import React, { useState } from 'react';
import LessonRateList from './LessonRateList';
import LessonRateForm from './LessonRateForm';
import apiClient from '../../../api/apiClient';
import axios from 'axios';
import { LessonType } from '@shared/models/LessonType';
import './TeacherLessonRatesManager.css';

interface LessonRate {
  id: string;
  type: string;
  rateInCents: number;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  lessonRates: LessonRate[];
  onRatesUpdated: (rates: LessonRate[]) => void;
}

const TeacherLessonRatesManager: React.FC<Props> = ({ lessonRates, onRatesUpdated }) => {
  const [editingRate, setEditingRate] = useState<LessonRate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddOrUpdate = async (rate: Partial<LessonRate>) => {
    try {
      setError(null);
      
      // The API expects lessonType and rateInCents parameters
      // When editing, include the ID to ensure we're updating the correct rate
      const apiPayload = {
        lessonType: rate.type,
        rateInCents: rate.rateInCents,
        ...(editingRate ? { id: editingRate.id } : {})
      };
      
      // Always use POST to /teachers/lesson-rates as the API uses upsert logic
      const updatedRate = await apiClient.post('/teachers/lesson-rates', apiPayload);
      
      // Update the rates list
      if (editingRate) {
        // If editing, replace the old rate with the updated one
        const updatedRates = lessonRates.map(r => 
          r.id === editingRate.id ? updatedRate.data : r
        );
        onRatesUpdated(updatedRates);
      } else {
        // If adding new, append to the list
        onRatesUpdated([...lessonRates, updatedRate.data]);
      }
      
      setEditingRate(null);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        // Use HTTP status codes to better categorize errors
        const status = err.response?.status || 0;
        const apiError = err.response?.data?.message || err.message;
        
        if (status === 409) {
          // 409 Conflict - Resource already exists
          setError(`You already have a rate for ${rate.type} lessons. Please edit the existing rate instead.`);
        } else if (status === 400) {
          // General validation error
          setError(`Failed to save lesson rate: ${apiError}`);
        } else if (status >= 500) {
          // Server errors
          setError('Server error occurred. Please try again later.');
        } else {
          // Other errors
          setError(`Failed to save lesson rate: ${apiError}`);
        }
      } else {
        setError('Failed to save lesson rate. Please try again.');
      }
      console.error('Error saving lesson rate:', err);
    }
  };

  const handleToggleActive = async (rate: LessonRate) => {
    try {
      setError(null);
      
      // The API expects lessonType in the body
      const apiPayload = {
        lessonType: rate.type
      };
      
      // Use the appropriate endpoint based on current status
      const endpoint = rate.isActive 
        ? '/teachers/lesson-rates/deactivate' 
        : '/teachers/lesson-rates/reactivate';
      
      const updatedRate = await apiClient.post(endpoint, apiPayload);
      
      // Update the rates list
      const updatedRates = lessonRates.map(r => 
        r.type === rate.type ? updatedRate.data : r
      );
      
      onRatesUpdated(updatedRates);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        // Use HTTP status codes to better categorize errors
        const status = err.response?.status || 0;
        const apiError = err.response?.data?.message || err.message;
        
        if (status === 409) {
          // 409 Conflict
          setError(`Cannot update status for ${rate.type} rate. There may be a conflict.`);
        } else if (status === 400) {
          // Bad Request
          setError(`Failed to update lesson rate status: ${apiError}`);
        } else if (status >= 500) {
          // Server errors
          setError('Server error occurred. Please try again later.');
        } else {
          // Other errors
          setError(`Failed to update lesson rate status: ${apiError}`);
        }
      } else {
        setError('Failed to update lesson rate status. Please try again.');
      }
      console.error('Error updating lesson rate status:', err);
    }
  };

  const handleEdit = (rate: LessonRate) => {
    setEditingRate(rate);
  };

  const handleCancel = () => {
    setEditingRate(null);
  };

  return (
    <div className="lesson-rates-manager card card-secondary">
      <div className="card-header">
        <h2 className="text-xl font-semibold">Lesson Rates Management</h2>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error mb-4">{error}</div>}
        
        <div className="rates-layout">
          <div className="rates-form-container">
            <LessonRateForm 
              rate={editingRate} 
              onSubmit={handleAddOrUpdate}
              onCancel={handleCancel}
            />
          </div>
          
          <div className="rates-list-container">
            <LessonRateList 
              rates={lessonRates} 
              onToggleActive={handleToggleActive}
              onEdit={handleEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLessonRatesManager; 