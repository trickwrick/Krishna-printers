import React from 'react';
import { Phone, Mail } from 'lucide-react';

const SUPPORT = {
  phone: '+91 97728 21573',
  email: 'info@printosync.com',
};

const MAINTENANCE_POINTS = [
  'If you require any new major features or additional development in the future, the cost will be calculated separately based on the agreed scope of work.',
  'Annual Server Maintenance Charges (AMC), as mentioned in the invoice shared with you via email, will be billed annually starting from the software activation date.',
];

const ContactSupport = () => (
  <div className="mx-auto mt-8 pb-12 max-w-7xl w-full px-4 sm:px-6 space-y-6">
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden w-full">
      <div className="h-1.5 bg-linear-to-r from-[#0c3d6e] via-[#1a5a9e] to-[#5ec6e8]" />

      <div className="px-8 sm:px-12 lg:px-16 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-[26px] font-bold text-[#0c3d6e] mb-8">
          Contact &amp; Support
        </h1>

        <div className="flex flex-col items-start gap-3 mb-6">
          <a
            href={`tel:${SUPPORT.phone}`}
            className="inline-flex items-center gap-3 border border-[#0c3d6e] rounded-sm px-5 py-3 text-[#0c3d6e] font-medium w-fit hover:bg-blue-50/40 transition-colors"
          >
            <Phone size={20} className="shrink-0" strokeWidth={2} />
            <span>{SUPPORT.phone}</span>
          </a>

          <a
            href={`mailto:${SUPPORT.email}`}
            className="inline-flex items-center gap-3 border border-[#0c3d6e] rounded-sm px-5 py-3 text-[#0c3d6e] font-medium w-fit hover:bg-blue-50/40 transition-colors"
          >
            <Mail size={20} className="shrink-0" strokeWidth={2} />
            <span>{SUPPORT.email}</span>
          </a>
        </div>

        <p className="text-sm font-bold text-[#0c3d6e] mb-4">
          Printing Press Management Software
        </p>

        <p className="text-sm text-gray-500 leading-relaxed">
          This software is designed and developed by <span className="font-semibold text-gray-700">Trickwrick Infotech Private Limited</span>.
          <br />
          © Copyright 2026 printosync. All Right Reserved
        </p>
      </div>
    </div>

    <div className="bg-white rounded-lg shadow-sm border border-gray-100 w-full px-8 sm:px-12 lg:px-16 py-8 sm:py-10">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
        Support &amp; Maintenance:
      </h2>

      <ul className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed list-none">
        {MAINTENANCE_POINTS.map((point) => (
          <li key={point} className="flex gap-3">
            <span className="text-[#0c3d6e] font-bold shrink-0">-</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default ContactSupport;
