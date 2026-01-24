import React from 'react'

export type ReportRendererProps = { value: string; onChange: (text: string)=>void }

import UltrasoundGeneric from './diagnostic_UltrasoundGeneric'
import CTScan from './diagnostic_CTScan'
import Echocardiography from './diagnostic_Echocardiography'
import Colonoscopy from './diagnostic_Colonoscopy'
import UpperGIEndoscopy from './diagnostic_UpperGIEndoscopy'

export const DiagnosticFormRegistry: Record<string, React.ComponentType<ReportRendererProps>> = {
  Ultrasound: UltrasoundGeneric,
  CTScan: CTScan,
  Echocardiography: Echocardiography,
  Colonoscopy: Colonoscopy,
  UpperGiEndoscopy: UpperGIEndoscopy,
}
