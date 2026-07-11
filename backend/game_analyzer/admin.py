from django.contrib import admin

# Register your models here.
from .models import Game, Move, Report

class GameAdmin(admin.ModelAdmin):
    list_display = ('white_player', 'black_player', 'result', 'date', 'time_control', 'end_time', 'termination')
    search_fields = ('white_player', 'black_player', 'result', 'date', 'time_control', 'end_time', 'termination')
    list_filter = ('result', 'date', 'time_control', 'end_time', 'termination')

class MoveAdmin(admin.ModelAdmin):
    list_display = ('game', 'move_number', 'white_move', 'black_move', 'evaluation')
    search_fields = ('game', 'move_number', 'white_move', 'black_move', 'evaluation')
    list_filter = ('game', 'move_number', 'white_move', 'black_move', 'evaluation')

class ReportAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at')
    search_fields = ('name', 'user', 'created_at')
    list_filter = ('user', 'created_at')

admin.site.register(Game, GameAdmin)    
admin.site.register(Move, MoveAdmin)
admin.site.register(Report, ReportAdmin)