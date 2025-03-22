// CACHE-BUSTER: 20250320101632
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LessonType } from '../types/lesson';
import apiClient from '../api/apiClient';

interface LessonRate {
  id: string;
  type: string;
  rateInCents: number;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TeacherLessonRatesManagerProps {
  lessonRates: LessonRate[];
  onRatesUpdated: (updatedRates: LessonRate[]) => void;
}

const TeacherLessonRatesManager: React.FC<TeacherLessonRatesManagerProps> = ({ 
  lessonRates, 
  onRatesUpdated 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state for adding/updating rates
  const [selectedLessonType, setSelectedLessonType] = useState<string>('');
  const [rateInDollars, setRateInDollars] = useState<string>('');

  // Helper to format cents as dollars for display
  const formatDollars = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  // Helper to convert dollars to cents
  const dollarsToCents = (dollars: string): number => {
    return Math.round(parseFloat(dollars) * 100);
  };

  // Get available lesson types that don't have an active rate yet
  const getAvailableLessonTypes = (): string[] => {
    const activeTypes = lessonRates
      .filter(rate => rate.isActive)
      .map(rate => rate.type);
    
    return Object.values(LessonType)
      .filter(type => !activeTypes.includes(type));
  };

  // Handle form submission to create/update a rate
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLessonType) {
      setError('Please select a lesson type');
      return;
    }

    if (!rateInDollars || isNaN(parseFloat(rateInDollars)) || parseFloat(rateInDollars) <= 0) {
      setError('Please enter a valid rate');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await apiClient.post('/teachers/lesson-rates', {
        lessonType: selectedLessonType,
        rateInCents: dollarsToCents(rateInDollars)
      });

      const newRate = response.data;
      
      // Update the local state with the new/updated rate
      const updatedRates = [...lessonRates];
      const existingIndex = updatedRates.findIndex(rate => rate.type === selectedLessonType);
      
      if (existingIndex >= 0) {
        updatedRates[existingIndex] = newRate;
      } else {
        updatedRates.push(newRate);
      }
      
      onRatesUpdated(updatedRates);
      setSuccess(`Successfully ${existingIndex >= 0 ? 'updated' : 'added'} rate for ${selectedLessonType} lessons`);
      
      // Reset form
      setSelectedLessonType('');
      setRateInDollars('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error updating lesson rate:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle deactivating a rate
  const handleDeactivate = async (lessonType: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await apiClient.post('/teachers/lesson-rates/deactivate', {
        lessonType
      });

      const updatedRate = response.data;
      
      // Update the local state
      const updatedRates = lessonRates.map(rate => 
        rate.type === lessonType ? updatedRate : rate
      );
      
      onRatesUpdated(updatedRates);
      setSuccess(`Successfully deactivated ${lessonType} lessons`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error deactivating lesson rate:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle reactivating a rate
  const handleReactivate = async (lessonType: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await apiClient.post('/teachers/lesson-rates/reactivate', {
        lessonType
      });

      const updatedRate = response.data;
      
      // Update the local state
      const updatedRates = lessonRates.map(rate => 
        rate.type === lessonType ? updatedRate : rate
      );
      
      onRatesUpdated(updatedRates);
      setSuccess(`Successfully reactivated ${lessonType} lessons`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error reactivating lesson rate:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form to add/update rates */}
      <div className="card card-accent h-fit">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Add or Update Lesson Rate</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label htmlFor="lessonType" className="label">
                <span className="label-text">Lesson Type</span>
              </label>
              <select
                id="lessonType"
                value={selectedLessonType}
                onChange={(e) => setSelectedLessonType(e.target.value)}
                disabled={loading}
                className="select select-bordered w-full"
              >
                <option value="">Select a lesson type</option>
                {Object.values(LessonType).map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label htmlFor="rateInDollars" className="label">
                <span className="label-text">Hourly Rate ($)</span>
              </label>
              <input
                id="rateInDollars"
                type="number"
                min="0"
                step="0.01"
                value={rateInDollars}
                onChange={(e) => setRateInDollars(e.target.value)}
                disabled={loading}
                placeholder="e.g. 45.00"
                className="input input-bordered w-full"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              disabled={loading || !selectedLessonType || !rateInDollars}
            >
              {loading ? 'Saving...' : 'Save Rate'}
            </button>
          </form>

          {error && <div className="alert alert-error mt-4">{error}</div>}
          {success && <div className="alert alert-success mt-4">{success}</div>}
        </div>
      </div>

      {/* Display current rates */}
      <div className="card card-accent">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Your Current Lesson Rates</h3>
        </div>
        <div className="card-body">
          {lessonRates.length === 0 ? (
            <p className="text-center text-gray-500">You haven't set any lesson rates yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Lesson Type</th>
                    <th>Rate (hourly)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessonRates.map(rate => (
                    <tr key={rate.id}>
                      <td>{rate.type.charAt(0) + rate.type.slice(1).toLowerCase()}</td>
                      <td>${formatDollars(rate.rateInCents)}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rate.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {rate.isActive ? (
                          <button 
                            className="btn btn-error btn-sm" 
                            onClick={() => handleDeactivate(rate.type)}
                            disabled={loading}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button 
                            className="btn btn-success btn-sm" 
                            onClick={() => handleReactivate(rate.type)}
                            disabled={loading}
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherLessonRatesManager; 