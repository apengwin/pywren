Deploy with `cd ~/pywren/gcf_handler && gcloud beta functions deploy handler --stage-bucket <bucket_name> --trigger-http --memory 1024MB --timeout 200`.

Everything else works the same.

Note that `.pywren_config` structure is all over the place. I've included it just as an example. Should not be merged.

## Still unfinished
* logging
* any sort of error handling
