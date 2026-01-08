/**
 * Default Field Mappings for Single Law Firm
 * Pre-configured intelligent mappings for common law firm data structures
 */

export interface FieldMapping {
  system: 'clio' | 'gohighlevel' | 'quickbooks';
  category: string;
  mappings: {
    [key: string]: {
      apiField: string;
      displayName: string;
      dataType: 'string' | 'number' | 'date' | 'boolean' | 'currency';
      transformation?: string;
      validation?: string;
    };
  };
}

export const DEFAULT_FIELD_MAPPINGS: FieldMapping[] = [
  // CLIO CASE MANAGEMENT MAPPINGS
  {
    system: 'clio',
    category: 'cases',
    mappings: {
      caseId: {
        apiField: 'id',
        displayName: 'Case ID',
        dataType: 'string'
      },
      caseName: {
        apiField: 'display_number',
        displayName: 'Case Number',
        dataType: 'string'
      },
      matterName: {
        apiField: 'description',
        displayName: 'Matter Name', 
        dataType: 'string'
      },
      clientName: {
        apiField: 'client.name',
        displayName: 'Client Name',
        dataType: 'string'
      },
      status: {
        apiField: 'status',
        displayName: 'Case Status',
        dataType: 'string'
      },
      chargeType: {
        apiField: 'practice_area',
        displayName: 'Charge Type',
        dataType: 'string',
        transformation: 'mapPracticeAreaToCharge'
      },
      openDate: {
        apiField: 'opened_date',
        displayName: 'Date Opened',
        dataType: 'date'
      },
      closeDate: {
        apiField: 'closed_date', 
        displayName: 'Date Closed',
        dataType: 'date'
      },
      outstandingBalance: {
        apiField: 'total_outstanding',
        displayName: 'Outstanding Balance',
        dataType: 'currency'
      },
      totalPayments: {
        apiField: 'total_paid',
        displayName: 'Total Payments',
        dataType: 'currency'
      }
    }
  },
  {
    system: 'clio',
    category: 'calendar',
    mappings: {
      eventId: {
        apiField: 'id',
        displayName: 'Event ID',
        dataType: 'string'
      },
      eventType: {
        apiField: 'type',
        displayName: 'Event Type', 
        dataType: 'string'
      },
      courtDate: {
        apiField: 'start_at',
        displayName: 'Court Date',
        dataType: 'date',
        validation: 'isCourtEvent'
      },
      matterId: {
        apiField: 'matter.id',
        displayName: 'Matter ID',
        dataType: 'string'
      }
    }
  },
  {
    system: 'clio',
    category: 'activities',
    mappings: {
      activityId: {
        apiField: 'id',
        displayName: 'Activity ID',
        dataType: 'string'
      },
      activityType: {
        apiField: 'type',
        displayName: 'Activity Type',
        dataType: 'string'
      },
      discoveryReceived: {
        apiField: 'type',
        displayName: 'Discovery Received',
        dataType: 'boolean',
        transformation: 'checkDiscoveryActivity'
      },
      pleaOfferReceived: {
        apiField: 'type', 
        displayName: 'Plea Offer Received',
        dataType: 'boolean',
        transformation: 'checkPleaOfferActivity'
      },
      activityDate: {
        apiField: 'date',
        displayName: 'Activity Date',
        dataType: 'date'
      },
      matterId: {
        apiField: 'matter.id',
        displayName: 'Matter ID',
        dataType: 'string'
      }
    }
  },

  // GOHIGHLEVEL LEAD MANAGEMENT MAPPINGS
  {
    system: 'gohighlevel',
    category: 'leads',
    mappings: {
      leadId: {
        apiField: 'id',
        displayName: 'Lead ID',
        dataType: 'string'
      },
      leadName: {
        apiField: 'name',
        displayName: 'Lead Name',
        dataType: 'string'
      },
      email: {
        apiField: 'email',
        displayName: 'Email',
        dataType: 'string'
      },
      phone: {
        apiField: 'phone',
        displayName: 'Phone',
        dataType: 'string'
      },
      source: {
        apiField: 'source',
        displayName: 'Lead Source',
        dataType: 'string',
        transformation: 'mapLeadSource'
      },
      createdDate: {
        apiField: 'dateAdded',
        displayName: 'Lead Created Date',
        dataType: 'date'
      },
      pipelineStage: {
        apiField: 'pipeline_stage',
        displayName: 'Pipeline Stage',
        dataType: 'string'
      },
      phoneTime: {
        apiField: 'phone_time_minutes',
        displayName: 'Phone Time (Minutes)',
        dataType: 'number'
      }
    }
  },
  {
    system: 'gohighlevel',
    category: 'opportunities',
    mappings: {
      opportunityId: {
        apiField: 'id',
        displayName: 'Opportunity ID', 
        dataType: 'string'
      },
      contactId: {
        apiField: 'contact_id',
        displayName: 'Contact ID',
        dataType: 'string'
      },
      pipelineId: {
        apiField: 'pipeline_id',
        displayName: 'Pipeline ID',
        dataType: 'string'
      },
      stageId: {
        apiField: 'pipeline_stage_id',
        displayName: 'Stage ID',
        dataType: 'string'
      },
      stageName: {
        apiField: 'pipeline_stage_name',
        displayName: 'Stage Name',
        dataType: 'string'
      },
      value: {
        apiField: 'monetary_value',
        displayName: 'Opportunity Value',
        dataType: 'currency'
      },
      status: {
        apiField: 'status',
        displayName: 'Opportunity Status',
        dataType: 'string'
      },
      consultScheduled: {
        apiField: 'pipeline_stage_name',
        displayName: 'Consult Scheduled',
        dataType: 'boolean',
        transformation: 'isConsultStage'
      },
      retainerSigned: {
        apiField: 'pipeline_stage_name',
        displayName: 'Retainer Signed',
        dataType: 'boolean',
        transformation: 'isRetainerStage'
      }
    }
  },

  // QUICKBOOKS FINANCIAL MAPPINGS
  {
    system: 'quickbooks',
    category: 'revenue',
    mappings: {
      invoiceId: {
        apiField: 'Id',
        displayName: 'Invoice ID',
        dataType: 'string'
      },
      customerId: {
        apiField: 'CustomerRef.value',
        displayName: 'Customer ID',
        dataType: 'string'
      },
      customerName: {
        apiField: 'CustomerRef.name',
        displayName: 'Customer Name',
        dataType: 'string'
      },
      totalAmount: {
        apiField: 'TotalAmt',
        displayName: 'Invoice Total',
        dataType: 'currency'
      },
      paidAmount: {
        apiField: 'Balance',
        displayName: 'Amount Paid',
        dataType: 'currency',
        transformation: 'calculatePaidAmount'
      },
      invoiceDate: {
        apiField: 'TxnDate',
        displayName: 'Invoice Date',
        dataType: 'date'
      },
      dueDate: {
        apiField: 'DueDate',
        displayName: 'Due Date',
        dataType: 'date'
      }
    }
  },
  {
    system: 'quickbooks',
    category: 'payments', 
    mappings: {
      paymentId: {
        apiField: 'Id',
        displayName: 'Payment ID',
        dataType: 'string'
      },
      amount: {
        apiField: 'TotalAmt',
        displayName: 'Payment Amount',
        dataType: 'currency'
      },
      paymentDate: {
        apiField: 'TxnDate',
        displayName: 'Payment Date',
        dataType: 'date'
      },
      customerId: {
        apiField: 'CustomerRef.value',
        displayName: 'Customer ID',
        dataType: 'string'
      }
    }
  },
  {
    system: 'quickbooks',
    category: 'expenses',
    mappings: {
      expenseId: {
        apiField: 'Id',
        displayName: 'Expense ID',
        dataType: 'string'
      },
      amount: {
        apiField: 'TotalAmt',
        displayName: 'Expense Amount',
        dataType: 'currency'
      },
      category: {
        apiField: 'AccountRef.name',
        displayName: 'Expense Category',
        dataType: 'string'
      },
      description: {
        apiField: 'Description',
        displayName: 'Description',
        dataType: 'string'
      },
      expenseDate: {
        apiField: 'TxnDate',
        displayName: 'Expense Date',
        dataType: 'date'
      },
      isAdvertising: {
        apiField: 'AccountRef.name',
        displayName: 'Is Advertising Expense',
        dataType: 'boolean',
        transformation: 'isAdvertisingExpense'
      }
    }
  }
];

/**
 * Field transformation functions for intelligent data mapping
 */
export const FIELD_TRANSFORMATIONS = {
  mapPracticeAreaToCharge: (practiceArea: string): string => {
    const chargeMapping: { [key: string]: string } = {
      'Criminal Defense': 'Criminal',
      'DUI/DWI': 'DUI', 
      'Traffic': 'Traffic',
      'Family Law': 'Family',
      'Personal Injury': 'PI',
      'Civil': 'Civil'
    };
    return chargeMapping[practiceArea] || practiceArea;
  },

  mapLeadSource: (source: string): string => {
    const sourceMapping: { [key: string]: string } = {
      'google_ads': 'Google LSA',
      'google_my_business': 'Google Business Profile',
      'facebook': 'Social Media',
      'instagram': 'Social Media', 
      'organic': 'Website/SEO',
      'referral': 'Referrals',
      'lsa': 'Google LSA'
    };
    return sourceMapping[source.toLowerCase()] || 'Other';
  },

  checkDiscoveryActivity: (activityType: string): boolean => {
    const discoveryTypes = ['discovery', 'evidence', 'document_received', 'police_report'];
    return discoveryTypes.some(type => activityType.toLowerCase().includes(type));
  },

  checkPleaOfferActivity: (activityType: string): boolean => {
    const pleaTypes = ['plea', 'offer', 'prosecution_offer', 'plea_agreement'];
    return pleaTypes.some(type => activityType.toLowerCase().includes(type));
  },

  isConsultStage: (stageName: string): boolean => {
    const consultStages = ['consultation', 'consult', 'meeting', 'appointment'];
    return consultStages.some(stage => stageName.toLowerCase().includes(stage));
  },

  isRetainerStage: (stageName: string): boolean => {
    const retainerStages = ['signed', 'retained', 'client', 'closed'];
    return retainerStages.some(stage => stageName.toLowerCase().includes(stage));
  },

  isAdvertisingExpense: (category: string): boolean => {
    const adCategories = ['advertising', 'marketing', 'google ads', 'facebook ads', 'ppc'];
    return adCategories.some(cat => category.toLowerCase().includes(cat));
  },

  calculatePaidAmount: (totalAmount: number, balance: number): number => {
    return totalAmount - balance;
  }
};

/**
 * Validation functions for data quality
 */
export const FIELD_VALIDATIONS = {
  isCourtEvent: (eventType: string): boolean => {
    const courtEvents = ['hearing', 'trial', 'court', 'arraignment', 'plea'];
    return courtEvents.some(event => eventType.toLowerCase().includes(event));
  }
};