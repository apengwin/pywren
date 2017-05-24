Deploy with `cd ~/pywren/gcf_handler && gcloud beta functions deploy handler --stage-bucket <bucket_name> --trigger-http --memory 1024MB --timeout 200`.

Everything else works the same out of the box

Note that `.pywren_config` structure is all over the place. I've included it just as an example. Should not be merged.

## TODO 
* finish logging
* It's unclear how to handle things when a quota is exceeded, since the function just fails silently without any updates on the client side.
