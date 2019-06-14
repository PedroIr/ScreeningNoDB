
service CatalogService {
    entity REPORT_PIE {
	    key LABEL  : String(10);
		PERCENTAGE : Integer;
	    ABSOLUTE   : Integer;
	}
    entity REPORT_BARS {
	    key	QUESTIONS : Integer;
		REQUISITIONS  : Integer;
	}
    entity REPORT_ROWS {
	    key QUESID : Integer;
		QUESTIONS  : String(100);
	    TIMES      : Integer;
	}
    entity REPORT_TABLE {
	    key SQID    : Integer;
	    REQID		 : Integer;
	    QNAME   	 : String(150);
	    QTYPE   	 : String(100);
	    REQUIRED     : String(10);
	    DISQUALIFIER : String(10);
	    REQNAME      : String(150);
	}
    entity TIMESTAMP {
	    key TIMEID : Integer;
		DATE : String(30);
	}
	entity UPDATE {
		key UPDATEID : Integer; 
	}
}
