package datasets

const (
	DefaultRetention = 3
	DefaultQueueSize = 64
	DefaultRowLimit  = 5000

	StatusQueued     = "queued"
	StatusUploaded   = "uploaded"
	StatusSpilled    = "spilled"
	DatasetFormatCSV = "csv"
)
