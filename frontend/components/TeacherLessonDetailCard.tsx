import React from 'react';
import { Lesson } from '@shared/models/Lesson';
import Card from '@frontend/components/shared/Card/Card';
import { LessonStatus } from '@shared/models/LessonStatus';

interface TeacherLessonDetailCardProps {
    lesson: Lesson;
}

const TeacherLessonDetailCard: React.FC<TeacherLessonDetailCardProps> = ({ lesson }) => {
    const student = lesson.quote.lessonRequest.student;
    const request = lesson.quote.lessonRequest;
    const quote = lesson.quote;

    const studentName = `${student?.firstName || 'N/A'} ${student?.lastName || ''}`;

    const displayStatus = lesson.currentStatus
        ? LessonStatus.getDisplayLabelForStatus(lesson.currentStatus.status)
        : 'Unknown Status';

    return (
        <Card
            title={`Lesson Details - ${studentName}`}
            subtitle={`Status: ${displayStatus}`}
            className="mb-6"
            headingLevel="h2"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                    <p><span className="font-semibold mr-1">Student:</span> {studentName}</p>
                    <p><span className="font-semibold mr-1">Age:</span> {student?.age !== null ? student.age : 'N/A'}</p>
                    <p><span className="font-semibold mr-1">Email:</span> {student?.email || 'N/A'}</p>
                    <p><span className="font-semibold mr-1">Phone:</span> {student?.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                    <p><span className="font-semibold mr-1">Start Time:</span> {request?.startTime ? new Date(request.startTime).toLocaleString() : 'N/A'}</p>
                    <p><span className="font-semibold mr-1">End Time:</span> {request?.endTime ? new Date(request.endTime).toLocaleString() : 'N/A'}</p>
                    <p><span className="font-semibold mr-1">Duration:</span> {request?.durationMinutes || 'N/A'} minutes</p>
                    <p><span className="font-semibold mr-1">Type:</span> {request?.type || 'N/A'}</p>
                </div>
                <div>
                    <p><span className="font-semibold mr-1">Address:</span> {request?.address?.toString() || 'N/A'}</p>
                </div>
                <div>
                    <p><span className="font-semibold mr-1">Cost:</span> {quote?.getFormattedCost() || 'N/A'}</p>
                    <p>
                        <span className="font-semibold mr-1">Rate (at time of quote):</span>
                        {quote?.hourlyRateInCents !== undefined
                            ? `${(quote.hourlyRateInCents / 100).toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                            })}/hr`
                            : 'N/A'}
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default TeacherLessonDetailCard; 