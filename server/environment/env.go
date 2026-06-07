package environment

func GetEnv(env string) string {
	if env == "production" {
		return "production"
	}
	return "development"
}


