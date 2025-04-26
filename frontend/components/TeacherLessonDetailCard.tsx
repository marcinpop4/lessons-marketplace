import React from 'react';
import { Lesson } from '@shared/models/Lesson';
import Card from '@frontend/components/shared/Card/Card';
import { LessonStatus, LessonStatusValue } from '@shared/models/LessonStatus';

interface TeacherLessonDetailCardProps {
    lesson: Lesson;
}

// Helper function to get status color based on lesson status
const getStatusColor = (lesson: Lesson): string => {
    if (!lesson.currentStatus) return 'bg-gray-200 text-gray-800';

    switch (lesson.currentStatus.status as LessonStatusValue) {
        case LessonStatusValue.ACCEPTED:
            return 'bg-blue-100 text-blue-800';
        case LessonStatusValue.DEFINED:
            return 'bg-indigo-100 text-indigo-800';
        case LessonStatusValue.COMPLETED:
            return 'bg-green-100 text-green-800';
        case LessonStatusValue.VOIDED:
            return 'bg-red-100 text-red-800';
        case LessonStatusValue.REJECTED:
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-200 text-gray-800';
    }
};

const TeacherLessonDetailCard: React.FC<TeacherLessonDetailCardProps> = ({ lesson }) => {
    const student = lesson.quote.lessonRequest.student;
    const request = lesson.quote.lessonRequest;
    const quote = lesson.quote;

    const studentName = `${student?.firstName || 'N/A'} ${student?.lastName || ''}`;
    const lessonTitle = `Lesson with ${studentName}`;

    const displayStatus = lesson.currentStatus
        ? LessonStatus.getDisplayLabelForStatus(lesson.currentStatus.status)
        : 'Unknown Status';

    return (
        <Card className="w-full bg-white rounded-lg overflow-hidden shadow-md mb-4">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">{lessonTitle}</h2>
                        <p className="text-sm text-gray-600 mt-1">Student: {studentName}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                        <span className={`inline-block rounded-full px-2 py-1 ${getStatusColor(lesson)}`}>
                            {displayStatus}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                        <p className="text-gray-600">Start Time:</p>
                        <p className="font-medium">{new Date(request.startTime).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">End Time:</p>
                        <p className="font-medium">{request.endTime.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Duration:</p>
                        <p className="font-medium">{request.durationMinutes} minutes</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Price:</p>
                        <p className="font-medium">{quote.getFormattedCost()}</p>
                    </div>
                </div>

                {lesson.currentStatus?.context && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                        <p className="font-medium text-gray-600">Notes:</p>
                        <p className="text-gray-700">{typeof lesson.currentStatus.context === 'object'
                            ? JSON.stringify(lesson.currentStatus.context)
                            : String(lesson.currentStatus.context)}</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default TeacherLessonDetailCard; 