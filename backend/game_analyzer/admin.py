from django.contrib import admin

# Register your models here.
from .models import Game

class GameAdmin(admin.ModelAdmin):
    list_display = ('white_player', 'black_player', 'result', 'date')
    search_fields = ('white_player', 'black_player', 'result', 'date')
    list_filter = ('result', 'date')

admin.site.register(Game, GameAdmin)