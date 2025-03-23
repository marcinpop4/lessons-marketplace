import React from 'react';

interface FormElementsProps {
  className?: string;
}

const FormElements: React.FC<FormElementsProps> = ({
  className = ''
}) => {
  return (
    <div className={`card card-secondary ${className}`}>
      <div className="card-header">
        <h3 className="text-xl font-semibold">Form Elements</h3>
      </div>
      <div className="space-y-4">
        <div className="form-group">
          <label htmlFor="demo-input">Text Input</label>
          <input 
            id="demo-input" 
            type="text" 
            placeholder="Enter text" 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="demo-select">Select</label>
          <select id="demo-select">
            <option value="">Select an option</option>
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
            <option value="3">Option 3</option>
          </select>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="demo-date">Date</label>
            <input 
              id="demo-date" 
              type="date"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="demo-number">Number</label>
            <input 
              id="demo-number" 
              type="number" 
              placeholder="0" 
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="demo-textarea">Textarea</label>
          <textarea
            id="demo-textarea"
            placeholder="Enter multiple lines of text"
            rows={3}
          ></textarea>
        </div>

        <div className="form-group">
          <label className="block mb-2">Checkbox</label>
          <div className="flex items-center">
            <input
              id="demo-checkbox"
              type="checkbox"
            />
            <label htmlFor="demo-checkbox" className="ml-2 cursor-pointer">
              Checkbox option
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="block mb-2">Radio Options</label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="demo-radio-1"
                type="radio"
                name="demo-radio"
              />
              <label htmlFor="demo-radio-1" className="ml-2 cursor-pointer">
                Radio option 1
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="demo-radio-2"
                type="radio"
                name="demo-radio"
              />
              <label htmlFor="demo-radio-2" className="ml-2 cursor-pointer">
                Radio option 2
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormElements; 